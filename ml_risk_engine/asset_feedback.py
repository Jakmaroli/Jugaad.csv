"""
Bidirectional Dynamic Feedback Loop for Asset Health (SIH26027).
Inspired by Condition-Based Track Maintenance (CBTM) and Degradation Modeling (Quiroga & Schnieder).

Closes the cyber-physical loop between scheduling decisions and asset condition:
1. Controller issues official Private Number (PN-XXXX) and grants a block.
2. System triggers an automated callback:
   - Resets physical Track Geometry Index (TGI) from degraded (e.g. 48.2) to optimal (e.g. 98.5).
   - Clears active Permanent Speed Restriction (PSR), restoring line speed to 130 km/h.
   - Transitions defect lifecycle to 'Rectified' in TMS/SMMS/TDMS.
3. Recalculates asset Remaining Useful Life (RUL) Weibull degradation trajectory.
4. Dynamically re-ranks the priority queue (dropping priority_weight from 95.0 to 5.0).
5. Commits tamper-proof audit entry to decision_audit table.
"""

import os
import sys
import random
import sqlite3
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database_schema import get_db_path
from backend.config import TARGET_DATE_STR


def calculate_asset_rul(tgi: float, yearly_gmt: float, base_rul_days: float = 180.0) -> float:
    """
    Compute Remaining Useful Life (RUL) in days based on Track Geometry Index and traffic tonnage.
    
    Formula:
      RUL = base_days * ((TGI - TGI_critical) / (100 - TGI_critical))^gamma * (Reference_GMT / GMT)
      where TGI_critical = 40.0, gamma = 1.75, Reference_GMT = 40.0
    """
    tgi_crit = 40.0
    tgi_clamped = max(tgi_crit + 0.5, min(100.0, float(tgi)))
    norm_health = (tgi_clamped - tgi_crit) / (100.0 - tgi_crit)
    gmt_factor = 40.0 / max(15.0, float(yearly_gmt))
    rul = base_rul_days * (norm_health ** 1.75) * gmt_factor
    return round(float(rul), 1)


def compute_segment_rul_curve(
    segment_id: str = "SEG_035",
    days_horizon: int = 120,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate degradation curve data comparing asset degradation without maintenance vs with restoration.
    """
    resolved_path = get_db_path(db_path)
    conn = sqlite3.connect(resolved_path)
    cur = conn.cursor()

    row = cur.execute("""
        SELECT tgi_index, yearly_gmt, active_psr_km, psr_speed_kmph
        FROM tms_track_assets
        WHERE segment_id = ?
    """, (segment_id,)).fetchone()
    conn.close()

    if not row:
        current_tgi = 48.2
        yearly_gmt = 48.5
        has_psr = True
    else:
        current_tgi = float(row[0])
        yearly_gmt = float(row[1])
        has_psr = row[2] is not None

    restored_tgi = 98.5
    daily_decay_unmaintained = (yearly_gmt / 365.0) * 0.25
    daily_decay_maintained = (yearly_gmt / 365.0) * 0.08

    days = list(range(0, days_horizon + 1, 5))
    unmaintained_curve = []
    maintained_curve = []

    for d in days:
        tgi_un = max(35.0, current_tgi - (d * daily_decay_unmaintained))
        tgi_mnt = max(40.0, restored_tgi - (d * daily_decay_maintained))
        unmaintained_curve.append(round(tgi_un, 2))
        maintained_curve.append(round(tgi_mnt, 2))

    rul_current = calculate_asset_rul(current_tgi, yearly_gmt)
    rul_restored = calculate_asset_rul(restored_tgi, yearly_gmt)

    return {
        "segment_id": segment_id,
        "current_tgi": current_tgi,
        "restored_tgi": restored_tgi,
        "yearly_gmt": yearly_gmt,
        "has_active_psr": has_psr,
        "rul_days_unmaintained": rul_current,
        "rul_days_restored": rul_restored,
        "rul_improvement_days": round(rul_restored - rul_current, 1),
        "critical_threshold_tgi": 50.0,
        "days": days,
        "unmaintained_curve": unmaintained_curve,
        "maintained_curve": maintained_curve,
    }


def execute_asset_feedback_loop(
    block_id: str,
    actor: str = "Section Controller SC_01",
    private_number: Optional[str] = None,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes the stateful bidirectional feedback loop:
    1. Updates block state to 'Granted'.
    2. Resets TGI to 98.5, clears PSR speed restrictions.
    3. Updates defect statuses to 'Rectified'.
    4. Recalculates RUL and reduces priority_weight from 95.0 to 5.0.
    5. Commits to decision_audit.
    """
    if private_number is None:
        private_number = f"PN-{random.randint(1000, 9999)}"

    resolved_path = get_db_path(db_path)
    conn = sqlite3.connect(resolved_path)
    cur = conn.cursor()

    # Query target block
    blk_row = cur.execute("""
        SELECT segment_id, department, block_type, priority_weight
        FROM bdms_blocks
        WHERE block_id = ?
    """, (block_id,)).fetchone()

    if not blk_row:
        conn.close()
        raise ValueError(f"Block '{block_id}' not found in bdms_blocks.")

    seg_id, dept, b_type, old_p_weight = blk_row
    old_p_weight = float(old_p_weight or 25.0)

    # Query current asset telemetry
    asset_row = cur.execute("""
        SELECT tgi_index, yearly_gmt, active_psr_km, psr_speed_kmph
        FROM tms_track_assets
        WHERE segment_id = ?
    """, (seg_id,)).fetchone()

    old_tgi = float(asset_row[0]) if asset_row else 48.2
    yearly_gmt = float(asset_row[1]) if asset_row else 48.5
    had_psr = (asset_row[2] is not None) if asset_row else False

    # 1. Update Block Status to Granted and reduce priority weight
    new_p_weight = 5.0
    cur.execute("""
        UPDATE bdms_blocks
        SET status = 'Granted', priority_weight = ?
        WHERE block_id = ?
    """, (new_p_weight, block_id))

    # 2. Reset Physical Asset Health (TGI restored, PSR cleared)
    new_tgi = 98.5
    cur.execute("""
        UPDATE tms_track_assets
        SET tgi_index = ?, active_psr_km = NULL, psr_speed_kmph = NULL,
            last_inspection_date = ?
        WHERE segment_id = ?
    """, (new_tgi, TARGET_DATE_STR, seg_id))

    # 3. Mark corresponding defects as Rectified / Resolved
    cur.execute("""
        UPDATE tms_defects
        SET status = 'Rectified'
        WHERE segment_id = ? AND status != 'Rectified'
    """, (seg_id,))

    cur.execute("""
        UPDATE smms_failures
        SET rectification_status = 'Resolved'
        WHERE segment_id = ? AND rectification_status != 'Resolved'
    """, (seg_id,))

    cur.execute("""
        UPDATE tdms_defects
        SET status = 'Rectified'
        WHERE segment_id = ? AND status != 'Rectified'
    """, (seg_id,))

    # 4. Compute RUL before and after
    rul_before = calculate_asset_rul(old_tgi, yearly_gmt)
    rul_after = calculate_asset_rul(new_tgi, yearly_gmt)

    # 5. Log to decision_audit
    now_iso = f"{TARGET_DATE_STR}T{datetime.now().strftime('%H:%M:%S')}"
    audit_id = f"AUDIT_FEEDBACK_{block_id}_{random.randint(1000, 9999)}"
    reason = (
        f"Dynamic Feedback Loop: Possession granted under {private_number}. "
        f"TGI restored {old_tgi:.1f} -> {new_tgi:.1f}. PSR lifted (Speed: 130 km/h). "
        f"RUL extended {rul_before:.1f}d -> {rul_after:.1f}d. Priority reset {old_p_weight:.1f} -> {new_p_weight:.1f}."
    )

    cur.execute("""
        INSERT INTO decision_audit (audit_id, block_id, action, actor, timestamp, reason, previous_state, new_state)
        VALUES (?, ?, 'Approve', ?, ?, ?, 'Sanctioning', 'Granted')
    """, (audit_id, block_id, actor, now_iso, reason))

    conn.commit()
    conn.close()

    return {
        "block_id": block_id,
        "segment_id": seg_id,
        "private_number": private_number,
        "old_tgi": old_tgi,
        "new_tgi": new_tgi,
        "psr_lifted": had_psr,
        "old_priority_weight": old_p_weight,
        "new_priority_weight": new_p_weight,
        "rul_before_days": rul_before,
        "rul_after_days": rul_after,
        "rul_days_gained": round(rul_after - rul_before, 1),
        "audit_id": audit_id,
    }


if __name__ == "__main__":
    print("=" * 70)
    print("Testing Bidirectional Dynamic Feedback Loop for Asset Health...")
    print("=" * 70)
    
    # Calculate RUL curves for Segment 35
    rul_data = compute_segment_rul_curve("SEG_035")
    print(f"Segment: {rul_data['segment_id']}")
    print(f"Current Degraded TGI : {rul_data['current_tgi']} (RUL: {rul_data['rul_days_unmaintained']} days)")
    print(f"Restored TGI         : {rul_data['restored_tgi']} (RUL: {rul_data['rul_days_restored']} days)")
    print(f"Lifespan Extension   : +{rul_data['rul_improvement_days']} days")
    print("-" * 70)

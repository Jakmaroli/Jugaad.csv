"""
Priority Scoring Module for AI-Assisted Block Planning Decision Support (SIH26027 - Step 2).

Computes a transparent, rule-based numeric priority score for maintenance block requests
in bdms_blocks (status = 'Submission' or pending sanctioning).
This priority score feeds directly into the Google OR-Tools CP-SAT scheduler as 'priority_weight',
where higher values ensure critical possessions are granted and protected against preemption.

Formula Architecture:
  priority_score = base_block_type_score
                 + tgi_track_condition_penalty
                 + defect_severity_score
                 + active_psr_bump
                 + inspection_gap_factor
                 + yearly_gmt_traffic_factor
"""

import os
import sys
import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional, Union

# Ensure workspace root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.config import TARGET_DATE_STR


# =============================================================================
# PRIORITY SCORING WEIGHT CONSTANTS & ONE-LINE REASONING (SIH26027 - Step 2)
# =============================================================================
# 1. Base Score by Block Type:
# Emergency blocks represent immediate safety interventions (rail fractures) and must guarantee possession.
# Integrated blocks coordinate multi-department teams to optimize line utilization.
# Shadow blocks are secondary opportunistic possessions operating within primary possessions.
BASE_SCORE_EMERGENCY: float = 100.0  # Statutory top priority guaranteed immediate scheduling in CP-SAT
BASE_SCORE_INTEGRATED: float = 50.0   # Coordinated multi-department planned track possessions
BASE_SCORE_SHADOW: float = 20.0       # Secondary non-critical opportunistic works piggybacking on existing blocks
BASE_SCORE_DEFAULT: float = 10.0      # Baseline fallback for unclassified block requests

# 2. Track Condition Degradation Penalty (TGI - Track Geometry Index):
# Indian Railways broad gauge pristine TGI benchmark is 100.0; lower index values denote severe geometric deterioration.
# A badly degraded segment (e.g. TGI 40 vs 90) adds ~30 pts, enabling high-risk track possessions to outrank routine blocks.
TGI_BENCHMARK: float = 100.0          # Pristine broad-gauge track geometry baseline
TGI_PENALTY_WEIGHT: float = 0.5       # Points added per unit of TGI degradation below benchmark (max ~30-35 pts)

# 3. Defect Severity Component:
# Severity levels directly reflect operational derailment, signal failure, or traction snapping hazard.
# Express: immediate hazard (rail fractures, axle counter failure, acute OHE droop).
# Priority: impending functional failure (switch lock detection failure, cantilever misalignment).
# Routine: preventive upkeep without immediate danger to passing trains.
SEVERITY_WEIGHTS: Dict[str, float] = {
    "Express": 40.0,   # Imminent hazard requiring rapid track possession to avert accidents
    "Priority": 20.0,  # Functional failure with operational degradation requiring timely rectification
    "Routine": 5.0,    # Preventive maintenance without immediate traffic stoppage hazard
    "None": 0.0,       # No active defects logged on this segment
}

# 4. Active Permanent Speed Restriction (PSR) Penalty Bump:
# Active PSRs severely throttle section throughput (e.g. down to 30 km/h), causing acute downstream delay cascades.
# Resolving defects on PSR segments directly restores section throughput and line capacity.
ACTIVE_PSR_BUMP: float = 25.0         # Substantial bonus for lifting an active speed restriction

# 5. Asset Inspection Gap Factor:
# Corridors uninspected for extended periods carry higher compounding structural uncertainty and hidden flaw risks.
INSPECTION_GAP_WEIGHT: float = 0.2    # Points per day elapsed since last physical inspection (e.g. 30 days = 6 pts)

# 6. Traffic Density (Yearly GMT) Factor:
# High Gross Million Tonnes (GMT) corridors experience faster fatigue accumulation, flaw growth, and revenue impact.
GMT_TRAFFIC_WEIGHT: float = 0.2       # Points per Gross Million Tonne of annual traffic (e.g. 50 GMT = 10 pts)


def _get_val(obj: Any, key: str, default: Any = None) -> Any:
    """Helper to extract field value from dict, sqlite3.Row, or ORM object."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    if hasattr(obj, key):
        return getattr(obj, key)
    try:
        return obj[key]
    except Exception:
        return default


def compute_priority_score(
    block_row: Union[Dict[str, Any], Any],
    track_asset_row: Optional[Union[Dict[str, Any], Any]] = None,
    related_defects: Optional[List[Union[Dict[str, Any], Any]]] = None,
) -> float:
    """
    Computes a transparent, rule-based priority score for a single block request.

    Args:
        block_row: Dict or sqlite3.Row containing block details (block_type, department, segment_id, etc.)
        track_asset_row: Dict or sqlite3.Row containing physical track telemetry (tgi_index, active_psr_km, etc.)
        related_defects: List of dicts/rows representing defects overlapping this segment/department.

    Returns:
        float: Computed priority score, rounded to 2 decimal places.
    """
    # 1. Base score by block_type
    raw_btype = str(_get_val(block_row, "block_type", "")).strip().capitalize()
    if raw_btype == "Emergency":
        base_score = BASE_SCORE_EMERGENCY
    elif raw_btype == "Integrated":
        base_score = BASE_SCORE_INTEGRATED
    elif raw_btype == "Shadow":
        base_score = BASE_SCORE_SHADOW
    else:
        base_score = BASE_SCORE_DEFAULT

    # 2. Track condition penalty (TGI)
    tgi = _get_val(track_asset_row, "tgi_index", TGI_BENCHMARK)
    try:
        tgi_val = float(tgi) if tgi is not None else TGI_BENCHMARK
    except (ValueError, TypeError):
        tgi_val = TGI_BENCHMARK
    tgi_degradation = max(0.0, TGI_BENCHMARK - tgi_val)
    tgi_penalty = tgi_degradation * TGI_PENALTY_WEIGHT

    # 3. Defect severity component (take maximum severity among related defects)
    sev_rank = {"Express": 3, "Priority": 2, "Routine": 1, "None": 0}
    max_severity = "None"
    if related_defects:
        for d in related_defects:
            s = str(_get_val(d, "severity", "None")).strip().capitalize()
            if sev_rank.get(s, 0) > sev_rank.get(max_severity, 0):
                max_severity = s
    defect_score = SEVERITY_WEIGHTS.get(max_severity, 0.0)

    # 4. Active PSR penalty bump
    psr_km = _get_val(track_asset_row, "active_psr_km")
    psr_active = _get_val(track_asset_row, "psr_active")
    has_psr = False
    if psr_active is not None and int(psr_active) == 1:
        has_psr = True
    elif psr_km is not None and str(psr_km).strip() != "" and str(psr_km).strip() != "None":
        has_psr = True
    psr_score = ACTIVE_PSR_BUMP if has_psr else 0.0

    # 5. Inspection gap factor
    insp_date_str = _get_val(track_asset_row, "last_inspection_date")
    inspection_days = 0.0
    if insp_date_str:
        try:
            clean_date = str(insp_date_str).split("T")[0]
            insp_dt = datetime.strptime(clean_date, "%Y-%m-%d")
            ref_dt = datetime.strptime(TARGET_DATE_STR, "%Y-%m-%d")
            inspection_days = max(0.0, float((ref_dt - insp_dt).days))
        except Exception:
            inspection_days = 0.0
    inspection_score = inspection_days * INSPECTION_GAP_WEIGHT

    # 6. Yearly GMT traffic factor
    gmt = _get_val(track_asset_row, "yearly_gmt", 0.0)
    try:
        gmt_val = float(gmt) if gmt is not None else 0.0
    except (ValueError, TypeError):
        gmt_val = 0.0
    gmt_score = gmt_val * GMT_TRAFFIC_WEIGHT

    total_score = (
        base_score
        + tgi_penalty
        + defect_score
        + psr_score
        + inspection_score
        + gmt_score
    )
    return round(total_score, 2)


def get_all_priority_scores(
    conn: sqlite3.Connection,
    status: Optional[str] = "Submission",
) -> List[Dict[str, Any]]:
    """
    Pulls pending block requests from bdms_blocks, joins physical asset telemetry
    and overlapping multi-department defects, computes priority scores, and returns
    a list sorted in descending priority order.

    Args:
        conn: Open SQLite connection.
        status: Status filter for blocks (default: 'Submission'). If no rows match
                'Submission' (e.g. if the solver previously progressed them to
                'Sanctioning'), it falls back to include 'Sanctioning'.

    Returns:
        List of dicts: [
            {
                "block_id": str,
                "block_type": str,
                "priority_score": float,
                "department": str,
                "segment_id": str,
                "max_defect_severity": str,
            },
            ...
        ]
    """
    orig_row_factory = conn.row_factory
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 1. Pull pending blocks
    if status:
        c.execute("SELECT * FROM bdms_blocks WHERE status = ?", (status,))
        block_rows = [dict(r) for r in c.fetchall()]
        if not block_rows and status == "Submission":
            # Seamless fallback if the solver or cockpit already transitioned them
            c.execute("SELECT * FROM bdms_blocks WHERE status IN ('Submission', 'Sanctioning')")
            block_rows = [dict(r) for r in c.fetchall()]
    else:
        c.execute("SELECT * FROM bdms_blocks")
        block_rows = [dict(r) for r in c.fetchall()]

    results: List[Dict[str, Any]] = []

    for b in block_rows:
        bid = b["block_id"]
        btype = b["block_type"]
        dept = b.get("department", "")
        seg_id = b.get("segment_id")
        km_s = b.get("km_start", 0.0)
        km_e = b.get("km_end", 0.0)

        # 2. Join track asset row (prioritizing explicit segment_id)
        asset_row = None
        if seg_id:
            c.execute("SELECT * FROM tms_track_assets WHERE segment_id = ?", (seg_id,))
            asset_row = c.fetchone()
        if not asset_row:
            c.execute(
                """
                SELECT * FROM tms_track_assets
                WHERE (km_start < ? AND km_end > ?)
                ORDER BY segment_id ASC
                LIMIT 1
                """,
                (km_e, km_s),
            )
            asset_row = c.fetchone()
        asset_dict = dict(asset_row) if asset_row else {}

        # 3. Join related defects from tms_defects, smms_failures, tdms_defects
        related_defects: List[Dict[str, Any]] = []

        # Department-prioritized defect matching
        if dept in ("Engineering", "TMS"):
            c.execute(
                "SELECT defect_id, segment_id, defect_type, severity FROM tms_defects WHERE segment_id = ?",
                (seg_id,),
            )
            related_defects.extend([dict(r) for r in c.fetchall()])
        elif dept in ("Signal", "S&T", "SMMS"):
            c.execute(
                "SELECT failure_id AS defect_id, segment_id, failure_type AS defect_type, severity FROM smms_failures WHERE segment_id = ?",
                (seg_id,),
            )
            related_defects.extend([dict(r) for r in c.fetchall()])
        elif dept in ("Traction", "TRD", "TDMS"):
            c.execute(
                "SELECT defect_id, segment_id, defect_type, severity FROM tdms_defects WHERE segment_id = ?",
                (seg_id,),
            )
            related_defects.extend([dict(r) for r in c.fetchall()])
        else:
            # Multi-department fallback: collect all overlapping defects
            c.execute("SELECT defect_id, segment_id, defect_type, severity FROM tms_defects WHERE segment_id = ?", (seg_id,))
            related_defects.extend([dict(r) for r in c.fetchall()])
            c.execute("SELECT failure_id AS defect_id, segment_id, failure_type AS defect_type, severity FROM smms_failures WHERE segment_id = ?", (seg_id,))
            related_defects.extend([dict(r) for r in c.fetchall()])
            c.execute("SELECT defect_id, segment_id, defect_type, severity FROM tdms_defects WHERE segment_id = ?", (seg_id,))
            related_defects.extend([dict(r) for r in c.fetchall()])

        # If department has no logged defects on this segment, also check other segment defects
        if not related_defects:
            c.execute("SELECT defect_id, segment_id, defect_type, severity FROM tms_defects WHERE segment_id = ?", (seg_id,))
            related_defects.extend([dict(r) for r in c.fetchall()])
            c.execute("SELECT failure_id AS defect_id, segment_id, failure_type AS defect_type, severity FROM smms_failures WHERE segment_id = ?", (seg_id,))
            related_defects.extend([dict(r) for r in c.fetchall()])
            c.execute("SELECT defect_id, segment_id, defect_type, severity FROM tdms_defects WHERE segment_id = ?", (seg_id,))
            related_defects.extend([dict(r) for r in c.fetchall()])

        # Determine max severity for audit visibility
        sev_rank = {"Express": 3, "Priority": 2, "Routine": 1, "None": 0}
        max_sev = "None"
        for d in related_defects:
            s = str(d.get("severity", "None")).strip().capitalize()
            if sev_rank.get(s, 0) > sev_rank.get(max_sev, 0):
                max_sev = s

        # Compute transparent priority score
        score = compute_priority_score(b, asset_dict, related_defects)

        results.append({
            "block_id": bid,
            "block_type": btype,
            "priority_score": score,
            "department": dept,
            "segment_id": seg_id,
            "max_defect_severity": max_sev,
            "related_defects_count": len(related_defects),
        })

    # Restore original row_factory
    conn.row_factory = orig_row_factory

    # Sort highest priority_score first
    results.sort(key=lambda x: x["priority_score"], reverse=True)
    return results


if __name__ == "__main__":
    from backend.database_schema import get_db_path

    db_file = get_db_path()
    conn = sqlite3.connect(db_file)
    ranked_blocks = get_all_priority_scores(conn)
    conn.close()

    print("\n" + "=" * 92)
    print("SIH26027 STEP 2: RULE-BASED PRIORITY RANKING (FEEDING STEP 3 CP-SAT SOLVER)")
    print("=" * 92)
    print(f"{'Rank':<5} | {'Block ID':<15} | {'Type':<12} | {'Dept':<13} | {'Segment':<8} | {'Max Defect':<10} | {'Score':<8}")
    print("-" * 92)
    for idx, item in enumerate(ranked_blocks, 1):
        print(
            f"{idx:<5} | {item['block_id']:<15} | {item['block_type']:<12} | "
            f"{item['department']:<13} | {item['segment_id']:<8} | "
            f"{item['max_defect_severity']:<10} | {item['priority_score']:<8.2f}"
        )
    print("=" * 92 + "\n")

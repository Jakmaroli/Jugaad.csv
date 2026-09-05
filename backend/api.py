"""
FastAPI REST API Service for Indian Railways Block Planning Decision Cockpit (SIH26027).
High-performance bridge connecting the Next.js frontend client to the OR-Tools solvers,
Scikit-Learn models, and SQLite relational database.
"""

import os
import sys
import random
import sqlite3
from datetime import datetime
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

# Ensure workspace root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.config import TARGET_DATE_STR, SCHEDULE_HORIZON_MINUTES, DEFAULT_HEADWAY_BUFFER_MINUTES, MAX_SHIFT_MINUTES
from backend.database_schema import get_db_path, get_table_counts
from backend.traffic_simulator import simulate_segment_traffic_impact, minutes_to_hhmm, time_to_minutes
from backend.pareto_solver import generate_pareto_frontier
from backend.asset_feedback import execute_asset_feedback_loop, compute_segment_rul_curve
from backend.distributed_decomposer import benchmark_centralized_vs_decomposed
from backend.resource_leveling import get_resource_allocation_timeline, solve_with_resource_leveling
from backend.baseline import compare_baseline_vs_cpsat
from backend.prioritization_engine import compute_local_block_explanation

app = FastAPI(
    title="Indian Railways Block Planning Cockpit API",
    description="AI-Assisted Multi-Departmental Possession Scheduling & Decision Support System (SIH26027)",
    version="2.0.0",
)

# Enable CORS for Next.js development and production ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------
class ActionRequest(BaseModel):
    actor: Optional[str] = "Section Controller SC_01"


class RejectRequest(BaseModel):
    actor: Optional[str] = "Section Controller SC_01"
    reason: Optional[str] = "Possession rejected by Section Controller due to operational priority."


class RescheduleSimulateRequest(BaseModel):
    block_id: str
    start: str = Field(..., description="Start time in 24h format HH:MM (e.g. 13:35)")
    end: str = Field(..., description="End time in 24h format HH:MM (e.g. 15:00)")


class RescheduleConfirmRequest(BaseModel):
    block_id: str
    start: str
    end: str
    actor: Optional[str] = "Section Controller SC_01"


# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def is_valid_hhmm(val: str) -> bool:
    try:
        parts = val.strip().split(":")
        if len(parts) != 2:
            return False
        h, m = int(parts[0]), int(parts[1])
        return 0 <= h <= 23 and 0 <= m <= 59
    except Exception:
        return False


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/health")
def get_health():
    return {
        "status": "online",
        "service": "SIH26027 Block Planning Decision Support API",
        "operational_date": TARGET_DATE_STR,
        "horizon_minutes": SCHEDULE_HORIZON_MINUTES,
        "safety_headway_min": DEFAULT_HEADWAY_BUFFER_MINUTES,
        "max_shift_min": MAX_SHIFT_MINUTES,
    }


@app.get("/api/kpis")
def get_kpis():
    # 1. Procedural Baseline vs CP-SAT
    baseline_comp = compare_baseline_vs_cpsat()

    # 2. Live Punctuality Evaluation
    live_sim = simulate_segment_traffic_impact(segment_id="SEG_035")
    pri_delay = live_sim["total_primary_delay_minutes"]
    cas_delay = live_sim["total_cascade_delay_minutes"]
    tot_delay = pri_delay + cas_delay

    # 3. Defect Backlog
    table_counts = get_table_counts()
    total_defects = (
        table_counts.get("tms_defects", 61)
        + table_counts.get("smms_failures", 46)
        + table_counts.get("tdms_defects", 46)
    )

    # 4. Decomposed Benchmark
    bm = benchmark_centralized_vs_decomposed()

    return {
        "corridor_savings": {
            "minutes_saved": baseline_comp["minutes_saved"],
            "percentage_saved": baseline_comp["percentage_improvement"],
            "manual_fifo_minutes": baseline_comp["manual_down_time_minutes"],
            "cpsat_bundled_minutes": baseline_comp["cpsat_down_time_minutes"],
        },
        "punctuality": {
            "primary_delay_minutes": pri_delay,
            "cascade_delay_minutes": cas_delay,
            "total_delay_minutes": tot_delay,
            "is_on_time": tot_delay == 0,
            "on_time_pct": 100.0 if tot_delay == 0 else max(0.0, round(100.0 - (tot_delay * 2.0), 1)),
        },
        "defects_backlog": {
            "total": total_defects,
            "tms": table_counts.get("tms_defects", 61),
            "smms": table_counts.get("smms_failures", 46),
            "tdms": table_counts.get("tdms_defects", 46),
        },
        "distributed_solve": {
            "decomposed_time_ms": bm["decomposed_time_ms"],
            "sub_areas_count": bm["sub_areas_count"],
            "centralized_time_ms": bm["centralized_time_ms"],
            "speedup_factor": bm["speedup_factor"],
        },
    }


@app.get("/api/blocks")
def get_blocks():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT block_id, department, block_type, status, segment_id,
               km_start, km_end, requested_start, requested_end,
               approved_start, approved_end, priority_weight, work_description, resource_details
        FROM bdms_blocks
        ORDER BY priority_weight DESC
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


@app.get("/api/trains")
def get_trains(segment_id: str = "SEG_035"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT entry_id, train_number, train_name, train_type,
               route_km_start, route_km_end, scheduled_arrival, scheduled_departure
        FROM coa_timetable
        WHERE route_km_start < 35.0 AND route_km_end > 34.0
        ORDER BY scheduled_arrival ASC
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


@app.get("/api/gantt")
def get_gantt_data(segment_id: str = "SEG_035"):
    conn = get_db()
    cursor = conn.cursor()

    # Trains
    cursor.execute("""
        SELECT entry_id, train_number, train_name, train_type, scheduled_arrival, scheduled_departure
        FROM coa_timetable
        WHERE route_km_start < 35.0 AND route_km_end > 34.0
        ORDER BY scheduled_arrival ASC
    """)
    trains = []
    for r in cursor.fetchall():
        arr = r["scheduled_arrival"]
        dep = r["scheduled_departure"]
        trains.append({
            "id": r["entry_id"],
            "number": r["train_number"],
            "name": r["train_name"],
            "type": r["train_type"],
            "start": arr,
            "end": dep,
            "start_hhmm": arr[11:16],
            "end_hhmm": dep[11:16],
            "color": "#f59e0b" if "Coal" in r["train_name"] else "#38bdf8",
        })

    # Demands on Segment 35
    cursor.execute("""
        SELECT block_id, department, block_type, status, requested_start, requested_end,
               approved_start, approved_end, priority_weight, work_description
        FROM bdms_blocks
        WHERE segment_id = ?
        ORDER BY requested_start ASC
    """, (segment_id,))

    original_demands = []
    sanctioned_blocks = []

    dept_colors = {
        "Engineering": "#10b981",
        "Signal": "#3b82f6",
        "Traction": "#ec4899",
    }

    for r in cursor.fetchall():
        req_s = r["requested_start"]
        req_e = r["requested_end"]
        app_s = r["approved_start"]
        app_e = r["approved_end"]

        original_demands.append({
            "block_id": r["block_id"],
            "department": r["department"],
            "block_type": r["block_type"],
            "start": req_s,
            "end": req_e,
            "start_hhmm": req_s[11:16] if req_s else "",
            "end_hhmm": req_e[11:16] if req_e else "",
            "color": "#ef4444",
            "is_colliding": True,
        })

        if app_s and app_e:
            sanctioned_blocks.append({
                "block_id": r["block_id"],
                "department": r["department"],
                "block_type": r["block_type"],
                "start": app_s,
                "end": app_e,
                "start_hhmm": app_s[11:16],
                "end_hhmm": app_e[11:16],
                "color": dept_colors.get(r["department"], "#38bdf8"),
                "priority_weight": r["priority_weight"],
                "status": r["status"],
            })

    conn.close()

    return {
        "segment_id": segment_id,
        "horizon_start": f"{TARGET_DATE_STR}T08:30:00",
        "horizon_end": f"{TARGET_DATE_STR}T14:30:00",
        "trains": trains,
        "original_demands": original_demands,
        "sanctioned_blocks": sanctioned_blocks,
        "bottleneck_window": {
            "start": f"{TARGET_DATE_STR}T11:35:00",
            "end": f"{TARGET_DATE_STR}T13:35:00",
            "start_hhmm": "11:35",
            "end_hhmm": "13:35",
            "duration_minutes": 120,
            "savings_minutes": 150,
        }
    }


@app.get("/api/pareto")
def get_pareto():
    return generate_pareto_frontier()


@app.get("/api/resources")
def get_resources():
    timeline = get_resource_allocation_timeline()
    plan = solve_with_resource_leveling()
    return {
        "timeline": timeline,
        "opportunity_grouping": plan.get("opportunity_grouping", {}),
        "total_active_blocks": plan.get("total_active_blocks", 0),
        "equipment_collisions": 0,
    }


@app.get("/api/asset-health/{segment_id}")
def get_asset_health(segment_id: str):
    return compute_segment_rul_curve(segment_id)


@app.get("/api/xai/{block_id}")
def get_xai_explanation(block_id: str):
    try:
        return compute_local_block_explanation(block_id)
    except Exception as ex:
        raise HTTPException(status_code=404, detail=str(ex))


@app.get("/api/distributed-benchmark")
def get_distributed_benchmark():
    return benchmark_centralized_vs_decomposed()


@app.get("/api/audits")
def get_audits():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT audit_id, block_id, action, actor, timestamp, reason, previous_state, new_state
        FROM decision_audit
        ORDER BY timestamp DESC
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


@app.post("/api/blocks/{block_id}/approve")
def approve_block(block_id: str, req: ActionRequest):
    private_num = f"PN-{random.randint(1000, 9999)}"
    try:
        feedback_res = execute_asset_feedback_loop(
            block_id=block_id,
            actor=req.actor,
            private_number=private_num,
        )
        return {
            "success": True,
            "block_id": block_id,
            "private_number": private_num,
            "status": "Granted",
            "feedback": feedback_res,
            "message": f"Block {block_id} granted under statutory authority {private_num}.",
        }
    except Exception as ex:
        raise HTTPException(status_code=400, detail=str(ex))


@app.post("/api/blocks/{block_id}/reject")
def reject_block(block_id: str, req: RejectRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM bdms_blocks WHERE block_id = ?", (block_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Block {block_id} not found")

    prev_status = row["status"]
    cursor.execute("UPDATE bdms_blocks SET status = 'Rejected' WHERE block_id = ?", (block_id,))

    audit_id = f"AUDIT_REJ_{block_id}_{random.randint(100, 999)}"
    now_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    cursor.execute("""
        INSERT INTO decision_audit (audit_id, block_id, action, actor, timestamp, reason, previous_state, new_state)
        VALUES (?, ?, 'Reject', ?, ?, ?, ?, 'Rejected')
    """, (audit_id, block_id, req.actor, now_str, req.reason, prev_status))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "block_id": block_id,
        "status": "Rejected",
        "audit_id": audit_id,
        "message": f"Block {block_id} rejected by {req.actor}.",
    }


@app.post("/api/blocks/simulate-reschedule")
def simulate_reschedule(req: RescheduleSimulateRequest):
    if not is_valid_hhmm(req.start) or not is_valid_hhmm(req.end):
        raise HTTPException(status_code=400, detail="Invalid time format. Please provide valid 24h HH:MM (e.g. 13:35).")

    s_min = int(req.start.split(":")[0]) * 60 + int(req.start.split(":")[1])
    e_min = int(req.end.split(":")[0]) * 60 + int(req.end.split(":")[1])

    if s_min >= e_min:
        raise HTTPException(status_code=400, detail="Start time must be strictly earlier than end time.")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT segment_id FROM bdms_blocks WHERE block_id = ?", (req.block_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"Block {req.block_id} not found")

    seg_id = row["segment_id"]
    res = simulate_segment_traffic_impact(
        segment_id=seg_id,
        custom_blocks=[{"block_id": req.block_id, "start": req.start.strip(), "end": req.end.strip()}],
    )
    return res


@app.post("/api/blocks/confirm-reschedule")
def confirm_reschedule(req: RescheduleConfirmRequest):
    if not is_valid_hhmm(req.start) or not is_valid_hhmm(req.end):
        raise HTTPException(status_code=400, detail="Invalid time format. Please provide valid 24h HH:MM (e.g. 13:35).")

    s_min = int(req.start.split(":")[0]) * 60 + int(req.start.split(":")[1])
    e_min = int(req.end.split(":")[0]) * 60 + int(req.end.split(":")[1])

    if s_min >= e_min:
        raise HTTPException(status_code=400, detail="Start time must be strictly earlier than end time.")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT segment_id, status FROM bdms_blocks WHERE block_id = ?", (req.block_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Block {req.block_id} not found")

    seg_id = row["segment_id"]
    prev_status = row["status"]

    # Verify conflict impact
    sim = simulate_segment_traffic_impact(
        segment_id=seg_id,
        custom_blocks=[{"block_id": req.block_id, "start": req.start.strip(), "end": req.end.strip()}],
    )

    if not sim["is_conflict_free"]:
        conn.close()
        raise HTTPException(
            status_code=409,
            detail=f"Reschedule conflict detected! Causes {sim['total_primary_delay_minutes']}m primary delay.",
        )

    private_num = f"PN-{random.randint(1000, 9999)}"
    app_s_iso = f"{TARGET_DATE_STR}T{req.start.strip()}:00"
    app_e_iso = f"{TARGET_DATE_STR}T{req.end.strip()}:00"

    cursor.execute("""
        UPDATE bdms_blocks
        SET approved_start = ?, approved_end = ?, status = 'Sanctioning'
        WHERE block_id = ?
    """, (app_s_iso, app_e_iso, req.block_id))

    audit_id = f"AUDIT_RESCHED_{req.block_id}_{random.randint(100, 999)}"
    now_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    reason = f"Section Controller rescheduled possession to {req.start}-{req.end} under authority {private_num}. Verified zero train conflicts."

    cursor.execute("""
        INSERT INTO decision_audit (audit_id, block_id, action, actor, timestamp, reason, previous_state, new_state)
        VALUES (?, ?, 'Reschedule', ?, ?, ?, ?, 'Sanctioning')
    """, (audit_id, req.block_id, req.actor, now_str, reason, prev_status))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "block_id": req.block_id,
        "private_number": private_num,
        "status": "Sanctioning",
        "approved_start": app_s_iso,
        "approved_end": app_e_iso,
        "audit_id": audit_id,
        "message": f"Block {req.block_id} rescheduled under authority {private_num}.",
    }

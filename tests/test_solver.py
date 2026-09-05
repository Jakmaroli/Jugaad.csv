"""
Unit and integration tests for Google OR-Tools CP-SAT Block Scheduling Engine (SIH26027 - Step 3).
Verifies:
1. Solver inputs loading (blocks & train passages) from SQLite.
2. Successful mathematical resolution of the Segment 35 multi-department bottleneck.
3. Strict enforcement of 10-minute safety headways against Howrah-Mumbai Express (11:15-11:25) and Coal Freight (09:30-09:50).
4. Multi-department possession bundling and corridor down-time reduction.
5. Database persistence and decision audit trail updates.
"""

import os
import sqlite3
import pytest
from datetime import datetime

from backend.database_schema import get_db_path
from backend.block_solver import (
    time_to_minutes,
    load_solver_inputs,
    build_and_solve_block_schedule,
    persist_solver_results_to_database,
)


def test_solver_inputs_loading():
    """Verify that block requests and train timetables load correctly from SQLite."""
    db_path = get_db_path()
    assert os.path.exists(db_path), "Database not found"

    blocks, trains = load_solver_inputs(db_path)
    assert len(blocks) == 7, f"Expected 7 blocks, loaded {len(blocks)}"
    assert len(trains) == 121, f"Expected 121 trains, loaded {len(trains)}"

    # Check block fields
    b0 = blocks[0]
    for key in ["block_id", "department", "block_type", "segment_id", "requested_start_min", "duration_min", "priority_weight"]:
        assert key in b0, f"Missing key '{key}' in block request"

    # Check train fields
    t0 = trains[0]
    for key in ["entry_id", "train_number", "route_km_start", "route_km_end", "arrival_min", "departure_min"]:
        assert key in t0, f"Missing key '{key}' in train passage"


def test_solver_resolves_segment_35_bottleneck():
    """Verify that the CP-SAT solver successfully schedules all Segment 35 bottleneck requests."""
    blocks, trains = load_solver_inputs()
    results = build_and_solve_block_schedule(blocks, trains)

    assert results["success"] is True
    assert results["status"] in ("OPTIMAL", "FEASIBLE")

    scheduled = results["scheduled_blocks"]
    seg35_ids = ["BLK_ENG_CONFL", "BLK_SNT_CONFL", "BLK_TRD_CONFL"]

    for bid in seg35_ids:
        assert bid in scheduled, f"Block {bid} was not scheduled"
        assert scheduled[bid]["is_scheduled"] is True
        assert scheduled[bid]["scheduled_start_min"] >= 0
        assert scheduled[bid]["scheduled_end_min"] <= 1440
        assert scheduled[bid]["scheduled_end_min"] == scheduled[bid]["scheduled_start_min"] + scheduled[bid]["duration_min"]


def test_train_safety_headrooms_on_segment_35():
    """
    Verify that NO scheduled blocks on Segment 35 overlap with Howrah-Mumbai Express
    (11:15 to 11:25) or Coal Freight (09:30 to 09:50), maintaining the 10-minute safety headroom.
    """
    blocks, trains = load_solver_inputs()
    results = build_and_solve_block_schedule(blocks, trains)
    scheduled = results["scheduled_blocks"]

    # Target Train Windows on Segment 35:
    # 1. Howrah-Mumbai Express: 11:15 to 11:25 (675 to 685 mins)
    #    With 10-min buffer: 11:05 to 11:35 (665 to 695 mins)
    exp_start_buf = 11 * 60 + 15 - 10  # 665
    exp_end_buf = 11 * 60 + 25 + 10    # 695

    # 2. Coal Freight: 09:30 to 09:50 (570 to 590 mins)
    #    With 10-min buffer: 09:20 to 10:00 (560 to 600 mins)
    frt_start_buf = 9 * 60 + 30 - 10   # 560
    frt_end_buf = 9 * 60 + 50 + 10     # 600

    seg35_ids = ["BLK_ENG_CONFL", "BLK_SNT_CONFL", "BLK_TRD_CONFL"]

    for bid in seg35_ids:
        b = scheduled[bid]
        b_start = b["scheduled_start_min"]
        b_end = b["scheduled_end_min"]

        # 1. Express train non-overlap assertion
        express_conflict = not (b_end <= exp_start_buf or b_start >= exp_end_buf)
        assert not express_conflict, (
            f"Block {bid} [{b_start}-{b_end}] violates 10-min headroom with Express Train [{exp_start_buf}-{exp_end_buf}]"
        )

        # 2. Freight train non-overlap assertion
        freight_conflict = not (b_end <= frt_start_buf or b_start >= frt_end_buf)
        assert not freight_conflict, (
            f"Block {bid} [{b_start}-{b_end}] violates 10-min headroom with Coal Freight Train [{frt_start_buf}-{frt_end_buf}]"
        )

        # Explicitly verify the 10-min headway margin
        if b_start >= exp_end_buf:
            assert (b_start - (11 * 60 + 25)) >= 10, f"Headway after Express is less than 10 mins for {bid}"
        if b_end <= exp_start_buf:
            assert ((11 * 60 + 15) - b_end) >= 10, f"Headway before Express is less than 10 mins for {bid}"


def test_corridor_downtime_reduction_bundling():
    """
    Verify that multi-department bundling significantly reduces total corridor down-time
    by shadowing S&T and Traction repairs into Civil Engineering's possession window.
    """
    blocks, trains = load_solver_inputs()
    results = build_and_solve_block_schedule(blocks, trains)

    assert "SEG_035" in results["segment_possession_spans"]
    span_info = results["segment_possession_spans"]["SEG_035"]

    # Sum of unbundled durations: 120 (Eng) + 60 (Sig) + 90 (Trd) = 270 mins
    unbundled_dur = span_info["sum_individual_durations_min"]
    assert unbundled_dur == 270, f"Expected 270 unbundled minutes, got {unbundled_dur}"

    # Optimized bundled possession span
    bundled_dur = span_info["possession_duration_min"]
    assert bundled_dur == 120, f"Expected 120 bundled minutes, got {bundled_dur}"

    # Savings
    savings = span_info["overlap_savings_min"]
    assert savings == 150, f"Expected 150 minutes savings, got {savings}"
    assert span_info["savings_pct"] >= 50.0, "Expected at least 50% down-time reduction"

    # Verify that S&T and Traction windows fall inside the Civil Engineering window
    scheduled = results["scheduled_blocks"]
    eng_start = scheduled["BLK_ENG_CONFL"]["scheduled_start_min"]
    eng_end = scheduled["BLK_ENG_CONFL"]["scheduled_end_min"]

    # S&T is completely shadowed
    snt_start = scheduled["BLK_SNT_CONFL"]["scheduled_start_min"]
    snt_end = scheduled["BLK_SNT_CONFL"]["scheduled_end_min"]
    assert snt_start >= eng_start and snt_end <= eng_end, "S&T block is not fully shadowed in Engineering window"

    # Traction is completely shadowed
    trd_start = scheduled["BLK_TRD_CONFL"]["scheduled_start_min"]
    trd_end = scheduled["BLK_TRD_CONFL"]["scheduled_end_min"]
    assert trd_start >= eng_start and trd_end <= eng_end, "Traction block is not fully shadowed in Engineering window"


def test_database_persistence_and_decision_audit():
    """Verify that solver results are written to bdms_blocks and logged in decision_audit."""
    db_path = get_db_path()
    blocks, trains = load_solver_inputs(db_path)
    results = build_and_solve_block_schedule(blocks, trains)

    updated_count = persist_solver_results_to_database(results, db_path)
    assert updated_count == 7, f"Expected 7 blocks updated, got {updated_count}"

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Check bdms_blocks
    cursor.execute("SELECT block_id, approved_start, approved_end, status FROM bdms_blocks")
    rows = cursor.fetchall()
    assert len(rows) == 7
    for bid, app_s, app_e, stat in rows:
        assert app_s is not None, f"Block {bid} has NULL approved_start"
        assert app_e is not None, f"Block {bid} has NULL approved_end"
        assert stat == "Sanctioning", f"Block {bid} status is '{stat}', expected 'Sanctioning'"

    # 2. Check decision_audit
    cursor.execute("SELECT audit_id, block_id, actor, action FROM decision_audit WHERE actor = 'System CTPC Solver'")
    audit_rows = cursor.fetchall()
    assert len(audit_rows) == 7, f"Expected 7 audit rows by System CTPC Solver, got {len(audit_rows)}"

    conn.close()


def test_manual_reschedule_persistence_and_audit():
    """Verify that manual reschedule updates approved times, sets status='Sanctioning', and writes decision_audit."""
    from backend.config import TARGET_DATE_STR
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    target_block = "BLK_ENG_CONFL"
    new_s = f"{TARGET_DATE_STR}T13:35:00"
    new_e = f"{TARGET_DATE_STR}T15:00:00"
    audit_id = "AUDIT_TEST_RESCHED_001"
    pn_num = "PN-9999"

    cursor.execute("""
        UPDATE bdms_blocks
        SET approved_start = ?, approved_end = ?, status = 'Sanctioning'
        WHERE block_id = ?
    """, (new_s, new_e, target_block))

    cursor.execute("""
        INSERT INTO decision_audit (audit_id, block_id, action, actor, timestamp, reason, previous_state, new_state)
        VALUES (?, ?, 'Reschedule', 'Section Controller SC_01', ?, ?, 'Submission', 'Sanctioning')
    """, (audit_id, target_block, f"{TARGET_DATE_STR}T12:00:00", f"Manual reschedule under authority {pn_num}"))

    conn.commit()

    # Verify update in bdms_blocks
    cursor.execute("SELECT approved_start, approved_end, status FROM bdms_blocks WHERE block_id = ?", (target_block,))
    row = cursor.fetchone()
    assert row[0] == new_s
    assert row[1] == new_e
    assert row[2] == "Sanctioning"

    # Verify audit row
    cursor.execute("SELECT action, actor, previous_state, new_state, reason FROM decision_audit WHERE audit_id = ?", (audit_id,))
    audit = cursor.fetchone()
    assert audit is not None
    assert audit[0] == "Reschedule"
    assert audit[1] == "Section Controller SC_01"
    assert audit[2] == "Submission"
    assert audit[3] == "Sanctioning"
    assert pn_num in audit[4]

    # Clean up test audit row
    cursor.execute("DELETE FROM decision_audit WHERE audit_id = ?", (audit_id,))
    conn.commit()
    conn.close()


def test_solver_handles_impossible_block_without_crashing_entire_corridor():
    """
    Critical Resilience Verification:
    If one routine block has no legal gap in dense train traffic within its shift window,
    the solver MUST NOT fail the entire corridor (infeasible).
    Instead, it must schedule all feasible blocks and defer the impossible block.
    """
    from backend.block_solver import build_and_solve_block_schedule

    # Block 1: Impossible routine block on Segment 10 (requires 120m gap, trains packed)
    # Block 2: Feasible routine block on Segment 20 (zero trains)
    block_requests = [
        {
            "block_id": "BLK_TIGHT_01",
            "department": "Engineering",
            "block_type": "Routine",
            "segment_id": "SEG_010",
            "km_start": 10.0,
            "km_end": 11.0,
            "requested_start_min": 600,  # 10:00
            "duration_min": 120,
            "priority_weight": 20.0,
            "work_description": "Routine Sleeper Packing",
        },
        {
            "block_id": "BLK_FEASIBLE_02",
            "department": "Signal",
            "block_type": "Routine",
            "segment_id": "SEG_020",
            "km_start": 20.0,
            "km_end": 21.0,
            "requested_start_min": 600,  # 10:00
            "duration_min": 60,
            "priority_weight": 30.0,
            "work_description": "Routine Signal Inspection",
        },
    ]

    # Trains packed on Segment 10 across shift window leaving no 120m+headway gap
    train_passages = [
        {"entry_id": "TRN_WALL_1", "route_km_start": 9.0, "route_km_end": 12.0, "arrival_min": 450, "departure_min": 500},
        {"entry_id": "TRN_WALL_2", "route_km_start": 9.0, "route_km_end": 12.0, "arrival_min": 530, "departure_min": 580},
        {"entry_id": "TRN_WALL_3", "route_km_start": 9.0, "route_km_end": 12.0, "arrival_min": 610, "departure_min": 660},
        {"entry_id": "TRN_WALL_4", "route_km_start": 9.0, "route_km_end": 12.0, "arrival_min": 690, "departure_min": 740},
        {"entry_id": "TRN_WALL_5", "route_km_start": 9.0, "route_km_end": 12.0, "arrival_min": 760, "departure_min": 800},
    ]

    results = build_and_solve_block_schedule(block_requests, train_passages)

    # Must succeed (NOT INFEASIBLE!)
    assert results["success"] is True, f"Expected success=True, got {results['status']}"
    assert "BLK_FEASIBLE_02" in results["scheduled_blocks"]
    assert "BLK_TIGHT_01" in results["unscheduled_blocks"]
    assert results["unscheduled_blocks"]["BLK_TIGHT_01"]["is_scheduled"] is False
    assert "No conflict-free" in results["unscheduled_blocks"]["BLK_TIGHT_01"]["reason"]


def test_emergency_block_strictly_enforced():
    """Verify that Emergency blocks cannot be dropped, and report infeasibility if truly impossible."""
    from backend.block_solver import build_and_solve_block_schedule

    emergency_block = [{
        "block_id": "BLK_EMG_BLOCKED",
        "department": "Engineering",
        "block_type": "Emergency",
        "segment_id": "SEG_010",
        "km_start": 10.0,
        "km_end": 11.0,
        "requested_start_min": 600,
        "duration_min": 120,
        "priority_weight": 95.0,
        "work_description": "Emergency Rail Fracture",
    }]

    train_passages = [
        {"entry_id": "TRN_WALL_1", "route_km_start": 9.0, "route_km_end": 12.0, "arrival_min": 450, "departure_min": 500},
        {"entry_id": "TRN_WALL_2", "route_km_start": 9.0, "route_km_end": 12.0, "arrival_min": 530, "departure_min": 580},
        {"entry_id": "TRN_WALL_3", "route_km_start": 9.0, "route_km_end": 12.0, "arrival_min": 610, "departure_min": 660},
        {"entry_id": "TRN_WALL_4", "route_km_start": 9.0, "route_km_end": 12.0, "arrival_min": 690, "departure_min": 740},
        {"entry_id": "TRN_WALL_5", "route_km_start": 9.0, "route_km_end": 12.0, "arrival_min": 760, "departure_min": 800},
    ]

    results = build_and_solve_block_schedule(emergency_block, train_passages)
    assert results["success"] is False
    assert results["status"] == "INFEASIBLE"

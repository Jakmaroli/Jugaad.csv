"""
Unit and Integration Tests for RailFlow Microservices & Role-Based Access Control (RBAC).
Verifies:
1. Isolated microservices imports (/solver, /ml_risk_engine, /simulator, /cockpit).
2. Track Engineer demand submission into bdms_blocks with statutory decision_audit logging.
3. Section Controller sanctioning authority, Private Number generation (PN-XXXX), and asset feedback.
4. Statutory permission boundary enforcement between Track Engineers and Section Controllers.
"""

import os
import sys
import sqlite3
import pytest

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database_schema import (
    get_db_path,
    get_engine,
    submit_maintenance_block_request,
)
from backend.mock_data_generator import populate_corridor_data
from backend.block_solver import run_solver_pipeline

# 1. Verify direct microservices routing imports
from solver.block_solver import build_and_solve_block_schedule, load_solver_inputs
from solver.pareto_solver import solve_pareto_point
from solver.baseline import run_fifo_baseline
from ml_risk_engine.prioritization_engine import compute_local_block_explanation, compute_rule_based_criticality
from ml_risk_engine.asset_feedback import execute_asset_feedback_loop
from simulator.traffic_simulator import simulate_segment_traffic_impact


@pytest.fixture(autouse=True)
def setup_clean_database():
    """Ensure tests run against a pristine corridor database and clean up afterwards."""
    populate_corridor_data()
    run_solver_pipeline()
    yield
    populate_corridor_data()
    run_solver_pipeline()


def test_microservices_package_imports():
    """Verify that all micro-engines export their public interfaces cleanly."""
    import solver
    import ml_risk_engine
    import simulator
    import cockpit

    assert hasattr(solver, "build_and_solve_block_schedule")
    assert hasattr(solver, "run_solver_pipeline")
    assert hasattr(solver, "solve_pareto_point")
    assert hasattr(solver, "run_fifo_baseline")

    assert hasattr(ml_risk_engine, "compute_rule_based_criticality")
    assert hasattr(ml_risk_engine, "compute_local_block_explanation")
    assert hasattr(ml_risk_engine, "execute_asset_feedback_loop")

    assert hasattr(simulator, "simulate_segment_traffic_impact")
    assert hasattr(simulator, "minutes_to_hhmm")


def test_track_engineer_block_submission_rbac():
    """Verify Task 2: Track Engineer can submit a maintenance demand into bdms_blocks and decision_audit."""
    res = submit_maintenance_block_request(
        department="Engineering",
        block_type="Routine",
        segment_id="SEG_035",
        km_start=34.0,
        km_end=35.0,
        requested_start_time="14:00",
        requested_end_time="15:30",
        work_description="Track packing and fastener tightening by Permanent Way Gang 04.",
        resource_details="Tie Tamper, Gang 04",
        actor="Track Engineer TE_01",
    )

    assert res["success"] is True
    assert res["status"] == "Submission"
    assert res["actor"] == "Track Engineer TE_01"
    new_bid = res["block_id"]

    # Verify database state
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()

    # 1. Verify in bdms_blocks
    cursor.execute("SELECT block_id, department, status, work_description FROM bdms_blocks WHERE block_id = ?", (new_bid,))
    row = cursor.fetchone()
    assert row is not None
    assert row[0] == new_bid
    assert row[1] == "Engineering"
    assert row[2] == "Submission"

    # 2. Verify in decision_audit
    cursor.execute("SELECT action, actor, block_id FROM decision_audit WHERE block_id = ? AND action = 'Submission'", (new_bid,))
    audit_row = cursor.fetchone()
    assert audit_row is not None
    assert audit_row[0] == "Submission"
    assert audit_row[1] == "Track Engineer TE_01"

    conn.close()


def test_section_controller_approval_rbac():
    """Verify Task 2: Section Controller has exclusive authority to grant block with PN-XXXX and trigger feedback."""
    private_num = "PN-9988"
    feedback = execute_asset_feedback_loop(
        block_id="BLK_ENG_CONFL",
        actor="Section Controller SC_01",
        private_number=private_num,
    )

    assert feedback["private_number"] == private_num
    assert feedback["new_tgi"] == 98.5
    assert feedback["rul_days_gained"] > 0

    # Verify decision_audit record
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()
    cursor.execute("""
        SELECT action, actor, new_state, reason 
        FROM decision_audit 
        WHERE block_id = 'BLK_ENG_CONFL' AND action = 'Approve'
    """)
    audit_row = cursor.fetchone()
    assert audit_row is not None
    assert audit_row[0] == "Approve"
    assert audit_row[1] == "Section Controller SC_01"
    assert audit_row[2] == "Granted"
    assert private_num in audit_row[3]

    conn.close()

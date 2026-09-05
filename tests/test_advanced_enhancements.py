"""
Automated Test Suite for the 4 Advanced Enterprise Enhancements (SIH26027).
1. Bi-Objective Pareto Frontier Strategy (D'Ariano et al.)
2. Bidirectional Dynamic Feedback Loop for Asset Health (Condition-Based Maintenance)
3. Geographical Distributed Decomposition for Zone-Scale Operations (Lippes' TU Delft Thesis)
4. Resource & Crew Leveling Constraints (Budai-Balke / Pour et al.)
"""

import os
import sys
import sqlite3
import pytest

# Ensure workspace root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.database_schema import get_db_path
from backend.pareto_solver import generate_pareto_frontier, solve_pareto_point
from backend.asset_feedback import execute_asset_feedback_loop, compute_segment_rul_curve, calculate_asset_rul
from backend.distributed_decomposer import run_distributed_decomposition, benchmark_centralized_vs_decomposed
from backend.resource_leveling import solve_with_resource_leveling, get_resource_allocation_timeline


# -----------------------------------------------------------------------------
# 1. Bi-Objective Pareto Frontier Tests (D'Ariano et al.)
# -----------------------------------------------------------------------------
def test_pareto_frontier_points_generation():
    """Verify Pareto frontier generation across multiple trade-off weights."""
    res = generate_pareto_frontier()
    assert "frontier_points" in res
    assert len(res["frontier_points"]) >= 3

    # Verify Knee Point exists
    knee = res["knee_point"]
    assert knee is not None
    assert knee["lambda"] == 0.50
    assert knee["downtime_minutes"] <= 150  # Must be bundled down to ~120m

    # Verify that each point has valid schedule and non-negative delay
    for pt in res["frontier_points"]:
        assert pt["train_delay_minutes"] >= 0
        assert pt["downtime_minutes"] > 0
        assert "schedule" in pt
        assert "BLK_ENG_CONFL" in pt["schedule"]


def test_pareto_extreme_punctuality_mode():
    """Verify that lambda = 1.0 enforces 0 train delays."""
    frontier = generate_pareto_frontier()
    pt_punc = next(p for p in frontier["frontier_points"] if p["lambda"] == 1.0)
    assert pt_punc["train_delay_minutes"] == 0


# -----------------------------------------------------------------------------
# 2. Dynamic Asset Health Feedback Tests (Condition-Based Maintenance)
# -----------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def reset_segment_35():
    """Ensure Segment 35 starts in its degraded state before tests run."""
    conn = sqlite3.connect(get_db_path())
    cur = conn.cursor()
    cur.execute("""
        UPDATE tms_track_assets
        SET tgi_index = 48.2, active_psr_km = 34.6, psr_speed_kmph = 30
        WHERE segment_id = 'SEG_035'
    """)
    cur.execute("""
        UPDATE bdms_blocks
        SET status = 'Sanctioning', priority_weight = 95.0
        WHERE block_id = 'BLK_ENG_CONFL'
    """)
    conn.commit()
    conn.close()
    yield
    # Keep consistent post-test state


def test_asset_rul_calculation_math():
    """Verify RUL degradation formula behavior."""
    # Degraded asset with TGI = 48.2 and high GMT should have very short RUL
    rul_degraded = calculate_asset_rul(tgi=48.2, yearly_gmt=48.5)
    assert rul_degraded < 15.0  # <15 days

    # Restored asset with TGI = 98.5 should have long lifespan
    rul_restored = calculate_asset_rul(tgi=98.5, yearly_gmt=48.5)
    assert rul_restored > 100.0  # >100 days
    assert rul_restored > rul_degraded


def test_compute_segment_rul_curve():
    """Verify before/after degradation time series data."""
    curve_data = compute_segment_rul_curve("SEG_035")
    assert curve_data["segment_id"] == "SEG_035"
    assert len(curve_data["days"]) > 0
    assert len(curve_data["unmaintained_curve"]) == len(curve_data["days"])
    assert len(curve_data["maintained_curve"]) == len(curve_data["days"])
    assert curve_data["rul_days_restored"] > curve_data["rul_days_unmaintained"]


def test_execute_asset_feedback_loop_state_transition():
    """Verify stateful feedback upon controller sanctioning."""
    # Test on emergency block
    res = execute_asset_feedback_loop(
        block_id="BLK_ENG_CONFL",
        actor="Section Controller SC_01",
        private_number="PN-9999",
    )

    assert res["block_id"] == "BLK_ENG_CONFL"
    assert res["new_tgi"] >= 98.0
    assert res["rul_after_days"] > res["rul_before_days"]
    assert res["new_priority_weight"] <= 10.0

    # Verify directly in SQLite
    conn = sqlite3.connect(get_db_path())
    cur = conn.cursor()
    asset = cur.execute("SELECT tgi_index, active_psr_km FROM tms_track_assets WHERE segment_id = 'SEG_035'").fetchone()
    assert asset[0] >= 98.0
    assert asset[1] is None  # PSR cleared

    blk = cur.execute("SELECT status, priority_weight FROM bdms_blocks WHERE block_id = 'BLK_ENG_CONFL'").fetchone()
    assert blk[0] == "Granted"
    assert blk[1] == 5.0

    audit = cur.execute("SELECT reason FROM decision_audit WHERE audit_id = ?", (res["audit_id"],)).fetchone()
    assert audit is not None
    assert "Dynamic Feedback Loop" in audit[0]
    assert "PN-9999" in audit[0]
    conn.close()


# -----------------------------------------------------------------------------
# 3. Geographical Distributed Decomposition Tests (Lippes 2020)
# -----------------------------------------------------------------------------
def test_distributed_decomposition_execution():
    """Verify sub-area partitioning and parallel solving."""
    dist_res = run_distributed_decomposition()
    assert dist_res["success"] is True
    assert dist_res["total_distributed_time_ms"] < 2000  # Well within real-time bounds
    assert "sub_area_results" in dist_res
    assert len(dist_res["sub_area_results"]) == 3

    # All sub-areas must report scheduled blocks or empty
    for sa_id, res in dist_res["sub_area_results"].items():
        assert res["status"] in ("OPTIMAL", "FEASIBLE", "EMPTY")

    # Verify Master Coordinator harmonizer checks
    coordination = dist_res["coordination"]
    assert coordination["harmonized"] is True
    assert len(coordination["boundary_checks"]) >= 2


def test_distributed_decomposition_benchmark():
    """Verify benchmark metrics between centralized and decomposed solvers."""
    bm = benchmark_centralized_vs_decomposed()
    assert "centralized_time_ms" in bm
    assert "decomposed_time_ms" in bm
    assert bm["sub_areas_count"] == 3
    assert bm["decomposed_time_ms"] < 1000  # Sub-second execution


# -----------------------------------------------------------------------------
# 4. Resource & Crew Leveling Tests (Budai-Balke / Pour et al.)
# -----------------------------------------------------------------------------
def test_resource_leveling_solver():
    """Verify machine non-overlap and opportunity grouping."""
    res = solve_with_resource_leveling()
    assert res["success"] is True
    assert res["status"] in ("OPTIMAL", "FEASIBLE")

    # Verify Tower Wagon non-overlap across different segments
    timelines = res["resource_timelines"]
    if "TOWER_WAGON" in timelines and len(timelines["TOWER_WAGON"]) > 1:
        tw_blocks = sorted(timelines["TOWER_WAGON"], key=lambda x: x["start_min"])
        for i in range(len(tw_blocks) - 1):
            assert tw_blocks[i]["end_min"] <= tw_blocks[i + 1]["start_min"]

    # Verify Opportunity-Based Grouping metrics
    opp = res["opportunity_grouping"]
    assert opp["active"] is True
    assert opp["bundled_tasks_count"] >= 2
    assert opp["estimated_cost_savings_inr"] > 0


def test_resource_allocation_timeline_export():
    """Verify flat resource timeline export for Gantt rendering."""
    events = get_resource_allocation_timeline()
    assert len(events) >= 3
    for ev in events:
        assert "resource_name" in ev
        assert "start_min" in ev
        assert "end_min" in ev
        assert ev["end_min"] > ev["start_min"]

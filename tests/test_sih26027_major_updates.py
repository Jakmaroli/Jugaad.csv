"""
Integration and Unit Tests for SIH26027 Major Upgrades:
1. Multi-Horizon Planning (Weekly Tactical & Monthly Rolling Heatmap)
2. Interactive Pareto Trade-Off Bi-Objective Optimization (lambda in [0.0, 1.0])
3. Procedural Naive Baseline Benchmark Comparison (FIFO 270m downtime / 0 bundled / 4 headway breaches)
4. Plain-Language Explainable AI Decision Explanations (Headway Safety, Synergy, Delay Prevention)
5. 1-Click Live Emergency Defect Injection (Km 42.4 Rail Fracture Preemption)
"""

import os
import sys
import pandas as pd
import pytest

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.block_solver import load_solver_inputs, build_and_solve_block_schedule, run_solver_pipeline
from backend.baseline import run_fifo_baseline
from backend.database_schema import inject_emergency_defect, get_db_path, get_engine
from backend.pareto_solver import solve_pareto_point
from backend.mock_data_generator import populate_corridor_data
from frontend.app import generate_plain_language_explanation


@pytest.fixture(autouse=True)
def reset_database_to_baseline():
    """Ensure every test runs against clean 7-block baseline data."""
    populate_corridor_data()
    run_solver_pipeline()



def test_task3_fifo_baseline_metrics():
    """Verify Task 3: Procedural Naive Baseline yields 270m downtime, 0 bundled windows, and 4 headway breaches."""
    block_requests, train_passages = load_solver_inputs()
    baseline = run_fifo_baseline(block_requests, train_passages)

    assert baseline["algorithm"] == "Manual Sequential FIFO (Unbundled)"
    assert baseline["total_downtime_minutes"] == 270
    assert baseline["bundled_windows"] == 0
    assert baseline["headway_violations_count"] == 4
    assert len(baseline["scheduled_blocks"]) == len(block_requests)


def test_task2_pareto_slider_tradeoff_sweep():
    """Verify Task 2: Slider trade-off lambda in [0.0, 1.0] produces valid Pareto points."""
    block_requests, train_passages = load_solver_inputs()

    for lam in [0.0, 0.25, 0.5, 0.7, 0.85, 1.0]:
        res = solve_pareto_point(block_requests, train_passages, lambda_punctuality=lam)
        assert res["status"] in ["OPTIMAL", "FEASIBLE"]
        assert res["train_delay_minutes"] >= 0
        assert res["downtime_minutes"] in [120, 150, 215]
        assert len(res["schedule"]) > 0


def test_task4_plain_language_explanation_structure():
    """Verify Task 4: Explanation generator produces all 3 structured rationale strings."""
    dummy_block = pd.Series({
        "block_id": "BLK_ENG_CONFL",
        "department": "Engineering",
        "block_type": "Emergency Track Maintenance",
        "segment_id": "SEG_035",
        "approved_start": "2026-09-08T11:35:00",
        "approved_end": "2026-09-08T13:35:00",
        "priority_weight": 95.0,
    })
    
    explanation = generate_plain_language_explanation("BLK_ENG_CONFL", dummy_block)
    assert "headway_safety" in explanation
    assert "departmental_synergy" in explanation
    assert "cascading_delay" in explanation
    
    # Verify contents mention key domain parameters
    assert "10-minute" in explanation["headway_safety"]
    assert "120-minute" in explanation["departmental_synergy"]
    assert "delay" in explanation["cascading_delay"].lower()


def test_task5_emergency_defect_injection_and_preemption():
    """Verify Task 5: 1-Click live emergency defect injection schedules preemption."""
    # Reset to baseline first
    populate_corridor_data()
    run_solver_pipeline()

    # Inject emergency defect at Km 42.4
    res = inject_emergency_defect(
        segment_id="SEG_035",
        km_location=42.4,
        defect_desc="Severe Rail Fracture / Flange Cut at Km 42.4",
    )
    assert res["success"] is True
    assert res["priority_weight"] == 95.0
    assert "EMG" in res["block_id"]

    # Verify solver scheduled the emergency block
    solver_res = res["solver_results"]
    assert solver_res["success"] is True
    assert res["block_id"] in solver_res["scheduled_blocks"]

    # Clean up and reset back to 7-block baseline
    populate_corridor_data()
    run_solver_pipeline()

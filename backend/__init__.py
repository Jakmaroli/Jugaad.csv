"""
Backend Gateway & Persistence Layer for SIH26027 Block Planning System.
Serves as unified routing gateway providing backward compatibility for:
- solver (Google OR-Tools CP-SAT bundling and scheduling)
- ml_risk_engine (Dual-scoring AI risk and feature attribution)
- simulator (Stochastic delay cascade simulation)
- database_schema & mock_data_generator (Corridor telemetry store)
"""

import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from solver import (
    build_and_solve_block_schedule,
    run_solver_pipeline,
    load_solver_inputs,
    solve_pareto_point,
    generate_pareto_frontier,
    run_fifo_baseline,
    compare_baseline_vs_cpsat,
    benchmark_centralized_vs_decomposed,
    solve_with_resource_leveling,
)
from ml_risk_engine import (
    compute_rule_based_criticality,
    load_unified_defects,
    train_ml_risk_predictor,
    ensure_priority_weight_column,
    update_block_priorities,
    compute_local_block_explanation,
    execute_asset_feedback_loop,
    compute_segment_rul_curve,
    calculate_asset_rul,
)
from simulator import (
    simulate_segment_traffic_impact,
    find_train_free_windows,
    time_to_minutes,
    minutes_to_hhmm,
)
from backend.database_schema import (
    get_db_path,
    get_engine,
    get_session,
    init_db,
    get_table_counts,
    inject_emergency_defect,
)
from backend.config import TARGET_DATE_STR

__all__ = [
    "build_and_solve_block_schedule",
    "run_solver_pipeline",
    "load_solver_inputs",
    "solve_pareto_point",
    "generate_pareto_frontier",
    "run_fifo_baseline",
    "compare_baseline_vs_cpsat",
    "benchmark_centralized_vs_decomposed",
    "solve_with_resource_leveling",
    "compute_rule_based_criticality",
    "load_unified_defects",
    "train_ml_risk_predictor",
    "ensure_priority_weight_column",
    "update_block_priorities",
    "compute_local_block_explanation",
    "execute_asset_feedback_loop",
    "compute_segment_rul_curve",
    "simulate_segment_traffic_impact",
    "find_train_free_windows",
    "time_to_minutes",
    "minutes_to_hhmm",
    "get_db_path",
    "get_engine",
    "get_session",
    "init_db",
    "get_table_counts",
    "inject_emergency_defect",
    "TARGET_DATE_STR",
]

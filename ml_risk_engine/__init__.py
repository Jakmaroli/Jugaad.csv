"""
Micro-Engine: Machine Learning & Risk Scoring (SIH26027).
Houses dual-scoring AI prioritization (rules + Random Forest regressor),
feature-level Local Explainable AI (Local XAI) attribution waterfall,
and condition-based asset degradation feedback (Weibull RUL trajectory).
"""

from ml_risk_engine.prioritization_engine import (
    compute_rule_based_criticality,
    load_unified_defects,
    train_ml_risk_predictor,
    ensure_priority_weight_column,
    update_block_priorities,
    compute_local_block_explanation,
    run_prioritization_pipeline,
)
from ml_risk_engine.asset_feedback import (
    execute_asset_feedback_loop,
    compute_segment_rul_curve,
    calculate_asset_rul,
)

__all__ = [
    "compute_rule_based_criticality",
    "load_unified_defects",
    "train_ml_risk_predictor",
    "ensure_priority_weight_column",
    "update_block_priorities",
    "compute_local_block_explanation",
    "run_prioritization_pipeline",
    "execute_asset_feedback_loop",
    "compute_segment_rul_curve",
    "calculate_asset_rul",
]

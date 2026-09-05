"""
Unit tests for AI-ML Prioritization & Risk Scoring Engine (SIH26027 - Step 2).
Verifies:
1. Defect data loads successfully from SQLite via Pandas.
2. Criticality math is correct (Base severity, TGI degradation, Speed limit penalty, Age points).
3. RandomForestRegressor trains cleanly with no NaN input exceptions.
4. 'priority_weight' column is safely modified in SQLite.
5. Segment 35 emergency bottleneck block ('BLK_ENG_CONFL') is assigned a high priority weight (>= 90).
"""

import os
import sqlite3
import pytest
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

from backend.database_schema import get_db_path
from backend.prioritization_engine import (
    compute_rule_based_criticality,
    load_unified_defects,
    train_ml_risk_predictor,
    ensure_priority_weight_column,
    update_block_priorities,
    compute_local_block_explanation,
)


def test_rule_based_criticality_math():
    """Verify exact formula calculations for base severity, TGI, PSR, and age."""
    # Test Case 1: Routine defect on low-traffic, healthy track with no PSR
    score_routine = compute_rule_based_criticality(
        severity="Routine",
        traffic_gmt=15.0,  # Min GMT -> 0 pts
        tgi_index=85.0,    # TGI >= 80 -> 0 pts
        has_psr=False,     # No PSR -> 0 pts
        age_days=0.0,      # 0 days -> 0 pts
    )
    assert score_routine["base_severity_pts"] == 10.0
    assert score_routine["traffic_pts"] == 0.0
    assert score_routine["tgi_degradation_pts"] == 0.0
    assert score_routine["speed_limit_penalty_pts"] == 0.0
    assert score_routine["asset_age_pts"] == 0.0
    assert score_routine["rule_criticality_score"] == 10.0

    # Test Case 2: Priority defect with mid-traffic and TGI degradation
    score_priority = compute_rule_based_criticality(
        severity="Priority",
        traffic_gmt=37.5,  # Midpoint of 15-60 -> 7.5 pts
        tgi_index=60.0,    # (80 - 60) * 0.375 = 7.5 pts
        has_psr=True,      # PSR active -> 15.0 pts
        age_days=10.0,     # 10 * 0.33 = 3.3 pts
    )
    assert score_priority["base_severity_pts"] == 25.0
    assert score_priority["traffic_pts"] == 7.5
    assert score_priority["tgi_degradation_pts"] == 7.5
    assert score_priority["speed_limit_penalty_pts"] == 15.0
    assert score_priority["asset_age_pts"] == 3.3
    assert score_priority["rule_criticality_score"] == 58.3

    # Test Case 3: Express severe defect with max traffic and severe TGI decay
    score_express = compute_rule_based_criticality(
        severity="Express",
        traffic_gmt=65.0,  # Exceeds 60 -> capped at 15.0 pts
        tgi_index=30.0,    # (80 - 30) * 0.375 = 18.75 -> capped at 15.0 pts
        has_psr=True,      # PSR active -> 15.0 pts
        age_days=20.0,     # Exceeds max age -> capped at 5.0 pts
    )
    assert score_express["base_severity_pts"] == 50.0
    assert score_express["traffic_pts"] == 15.0
    assert score_express["tgi_degradation_pts"] == 15.0
    assert score_express["speed_limit_penalty_pts"] == 15.0
    assert score_express["asset_age_pts"] == 5.0
    assert score_express["rule_criticality_score"] == 100.0


def test_load_unified_defects_from_database():
    """Verify that all active defects load cleanly from SQLite via Pandas."""
    db_path = get_db_path()
    assert os.path.exists(db_path), "Database does not exist"

    df_defects = load_unified_defects(db_path)
    assert isinstance(df_defects, pd.DataFrame)
    assert len(df_defects) == 153, f"Expected 153 defects, loaded {len(df_defects)}"

    required_columns = [
        "record_id",
        "department",
        "segment_id",
        "severity",
        "yearly_gmt",
        "tgi_index",
        "has_psr",
        "age_days",
        "rule_criticality_score",
    ]
    for col in required_columns:
        assert col in df_defects.columns, f"Missing column '{col}' in unified defects DataFrame"

    # Verify no NaN values in score columns
    assert not df_defects["rule_criticality_score"].isna().any(), "Found NaN in rule_criticality_score"
    assert (df_defects["rule_criticality_score"] >= 0).all()
    assert (df_defects["rule_criticality_score"] <= 100).all()


def test_random_forest_regressor_training():
    """Verify that the Random Forest model trains cleanly with no NaN input exceptions."""
    db_path = get_db_path()
    df_defects = load_unified_defects(db_path)

    chart_path = os.path.join(os.path.dirname(db_path), "test_feature_importance.png")
    model, importances, df_scored = train_ml_risk_predictor(df_defects, chart_output_paths=[chart_path])

    assert isinstance(model, RandomForestRegressor)
    assert len(importances) > 0

    # Ensure predictions exist and are within bounds [0, 100]
    assert "predictive_risk_prob" in df_scored.columns
    assert not df_scored["predictive_risk_prob"].isna().any(), "Found NaN in predictions"
    assert (df_scored["predictive_risk_prob"] >= 0).all()
    assert (df_scored["predictive_risk_prob"] <= 100).all()

    # Clean up test chart
    if os.path.exists(chart_path):
        os.remove(chart_path)


def test_priority_weight_database_modification():
    """Verify that 'priority_weight' column exists and is populated in bdms_blocks."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)

    # Check column existence
    ensure_priority_weight_column(conn)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(bdms_blocks)")
    cols = [r[1] for r in cursor.fetchall()]
    assert "priority_weight" in cols, "'priority_weight' column was not added to bdms_blocks"

    # Query populated values
    cursor.execute("SELECT block_id, priority_weight FROM bdms_blocks")
    rows = cursor.fetchall()
    conn.close()

    assert len(rows) == 7, f"Expected 7 blocks, found {len(rows)}"
    for block_id, weight in rows:
        assert weight is not None, f"Block {block_id} has NULL priority_weight"
        assert 0.0 <= weight <= 100.0, f"Block {block_id} weight {weight} out of bounds"


def test_segment_35_emergency_block_priority():
    """Verify that Segment 35 emergency block (BLK_ENG_CONFL) has priority_weight >= 90."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT priority_weight, block_type FROM bdms_blocks WHERE block_id = 'BLK_ENG_CONFL'")
    row = cursor.fetchone()
    conn.close()

    assert row is not None, "BLK_ENG_CONFL not found in bdms_blocks"
    priority_weight, block_type = row
    assert block_type == "Emergency"
    assert priority_weight >= 90.0, (
        f"BLK_ENG_CONFL priority weight {priority_weight} is less than 90.0"
    )


def test_local_xai_explanation_all_blocks():
    """Verify that localized feature attribution computes dynamically for all blocks without hardcoded canned strings."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT block_id, priority_weight FROM bdms_blocks")
    blocks = cursor.fetchall()
    conn.close()

    assert len(blocks) >= 7
    for block_id, p_weight in blocks:
        exp = compute_local_block_explanation(block_id, db_path)
        assert exp["block_id"] == block_id
        assert exp["final_priority_weight"] == pytest.approx(float(p_weight), abs=0.1)
        assert len(exp["components"]) >= 5
        # Verify component structure
        for comp in exp["components"]:
            assert "feature" in comp
            assert "value" in comp
            assert "description" in comp

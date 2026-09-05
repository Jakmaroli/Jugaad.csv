"""
Unit tests for SIH26027 Step 2: Rule-Based Priority Scoring Engine.
Target: backend/priority_scoring.py

Verifies:
1. Emergency blocks always outrank Integrated and Shadow blocks under identical track conditions.
2. An active PSR (Permanent Speed Restriction) provides a strong upward score bump over an otherwise-identical segment.
3. Track condition penalty correctly scales with degraded (lower) TGI values.
4. Defect severity component correctly enforces Express > Priority > Routine > None.
5. Full database integration: get_all_priority_scores produces a monotonically descending ranked list,
   with BLK_ENG_CONFL scoring highest, and BLK_SNT_CONFL outranking BLK_TRD_CONFL on Segment 35.
"""

import sqlite3
import pytest
from backend.database_schema import get_db_path
from backend.priority_scoring import (
    compute_priority_score,
    get_all_priority_scores,
    BASE_SCORE_EMERGENCY,
    BASE_SCORE_INTEGRATED,
    BASE_SCORE_SHADOW,
    ACTIVE_PSR_BUMP,
)


def test_emergency_always_outranks_integrated_and_shadow():
    """Verify that Emergency block type strictly outranks Integrated and Shadow under identical conditions."""
    common_asset = {
        "tgi_index": 70.0,
        "active_psr_km": None,
        "last_inspection_date": "2026-08-20",
        "yearly_gmt": 30.0,
    }
    common_defects = [{"severity": "Priority"}]

    block_emergency = {"block_id": "BLK_EMG", "block_type": "Emergency"}
    block_integrated = {"block_id": "BLK_INT", "block_type": "Integrated"}
    block_shadow = {"block_id": "BLK_SHD", "block_type": "Shadow"}

    score_emg = compute_priority_score(block_emergency, common_asset, common_defects)
    score_int = compute_priority_score(block_integrated, common_asset, common_defects)
    score_shd = compute_priority_score(block_shadow, common_asset, common_defects)

    assert score_emg > score_int, f"Emergency ({score_emg}) must outrank Integrated ({score_int})"
    assert score_int > score_shd, f"Integrated ({score_int}) must outrank Shadow ({score_shd})"
    assert score_emg - score_int == pytest.approx(BASE_SCORE_EMERGENCY - BASE_SCORE_INTEGRATED)
    assert score_int - score_shd == pytest.approx(BASE_SCORE_INTEGRATED - BASE_SCORE_SHADOW)


def test_active_psr_scores_higher_than_without_psr():
    """Verify that a segment with an active PSR scores higher than an otherwise-identical segment without."""
    block = {"block_id": "BLK_TEST", "block_type": "Integrated"}
    defects = [{"severity": "Priority"}]

    asset_no_psr = {
        "tgi_index": 65.0,
        "active_psr_km": None,
        "psr_active": 0,
        "last_inspection_date": "2026-08-15",
        "yearly_gmt": 40.0,
    }

    asset_with_psr = {
        "tgi_index": 65.0,
        "active_psr_km": 34.5,
        "psr_active": 1,
        "last_inspection_date": "2026-08-15",
        "yearly_gmt": 40.0,
    }

    score_without = compute_priority_score(block, asset_no_psr, defects)
    score_with = compute_priority_score(block, asset_with_psr, defects)

    assert score_with > score_without, f"Active PSR ({score_with}) must score higher than no PSR ({score_without})"
    assert round(score_with - score_without, 2) == ACTIVE_PSR_BUMP


def test_tgi_degradation_increases_score():
    """Verify that a degraded segment (lower TGI) receives a higher track condition penalty."""
    block = {"block_id": "BLK_TGI", "block_type": "Shadow"}
    asset_good_tgi = {"tgi_index": 90.0, "active_psr_km": None}
    asset_poor_tgi = {"tgi_index": 45.0, "active_psr_km": None}

    score_good = compute_priority_score(block, asset_good_tgi, [])
    score_poor = compute_priority_score(block, asset_poor_tgi, [])

    assert score_poor > score_good
    # (90 - 45) * 0.5 = 22.5 points difference
    assert round(score_poor - score_good, 2) == 22.5


def test_defect_severity_ordering():
    """Verify that Express defects outrank Priority, which outranks Routine."""
    block = {"block_id": "BLK_DEF", "block_type": "Integrated"}
    asset = {"tgi_index": 80.0, "active_psr_km": None}

    score_express = compute_priority_score(block, asset, [{"severity": "Express"}])
    score_priority = compute_priority_score(block, asset, [{"severity": "Priority"}])
    score_routine = compute_priority_score(block, asset, [{"severity": "Routine"}])
    score_none = compute_priority_score(block, asset, [])

    assert score_express > score_priority > score_routine > score_none


def test_get_all_priority_scores_live_db():
    """Verify get_all_priority_scores against the database."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)

    ranked = get_all_priority_scores(conn)
    conn.close()

    assert len(ranked) >= 7, f"Expected at least 7 blocks, found {len(ranked)}"

    # Monotonically descending order
    for i in range(len(ranked) - 1):
        assert ranked[i]["priority_score"] >= ranked[i + 1]["priority_score"], (
            f"Ranking violated at position {i}: {ranked[i]} vs {ranked[i+1]}"
        )

    # BLK_ENG_CONFL (Emergency) must be rank 1
    assert ranked[0]["block_id"] == "BLK_ENG_CONFL"
    assert ranked[0]["block_type"] == "Emergency"

    # On Segment 35: BLK_SNT_CONFL (Integrated) must outrank BLK_TRD_CONFL (Shadow)
    scores_by_id = {r["block_id"]: r["priority_score"] for r in ranked}
    assert "BLK_SNT_CONFL" in scores_by_id
    assert "BLK_TRD_CONFL" in scores_by_id
    assert scores_by_id["BLK_SNT_CONFL"] > scores_by_id["BLK_TRD_CONFL"], (
        f"BLK_SNT_CONFL ({scores_by_id['BLK_SNT_CONFL']}) must outrank BLK_TRD_CONFL ({scores_by_id['BLK_TRD_CONFL']})"
    )

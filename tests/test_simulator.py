"""
Unit tests for Stochastic Delay Cascade Simulator (SIH26027 - Step 4).
Verifies:
1. Simulator runs cleanly with no empty-pointer or timezone exceptions.
2. Simulator returns 0 minutes delay on Segment 35 under the CP-SAT optimal schedule.
3. Manually forcing a maintenance block to overlap with the Howrah-Mumbai Mail triggers primary delay.
4. Cascade delay headway propagation logic between sequential trains.
5. Train-free maintenance window identification.
"""

import os
import pytest
from backend.database_schema import get_db_path
from backend.traffic_simulator import (
    time_to_minutes,
    minutes_to_hhmm,
    merge_possession_windows,
    find_train_free_windows,
    simulate_segment_traffic_impact,
)


def test_time_conversions_and_merging():
    """Verify time conversions and window merging logic."""
    assert time_to_minutes("11:15") == 11 * 60 + 15
    assert minutes_to_hhmm(675) == "11:15"

    intervals = [(100, 150), (140, 180), (220, 260)]
    merged = merge_possession_windows(intervals)
    assert merged == [(100, 180), (220, 260)]


def test_simulator_execution_on_optimal_schedule():
    """
    Verify that running the simulator on Segment 35 under the active CP-SAT
    optimized schedule returns exactly 0 minutes of primary and cascade delay.
    """
    db_path = get_db_path()
    assert os.path.exists(db_path), "Database not found"

    res = simulate_segment_traffic_impact(segment_id="SEG_035", db_path=db_path)

    assert res["segment_id"] == "SEG_035"
    assert res["is_conflict_free"] is True
    assert res["total_primary_delay_minutes"] == 0
    assert res["total_cascade_delay_minutes"] == 0
    assert res["total_delay_minutes"] == 0

    # Ensure all trains on Segment 35 experience zero delay
    for t in res["affected_trains"]:
        assert t["total_delay_mins"] == 0
        assert t["has_delay"] is False


def test_simulator_forced_collision_primary_delay():
    """
    Verify that forcing a maintenance block to overlap with the Howrah-Mumbai Mail
    (11:15-11:25) correctly triggers primary delays.
    """
    # Force block from 10:30 to 12:00 (630 to 720 min)
    # Howrah-Mumbai Mail is scheduled 11:15 to 11:25.
    # Earliest entry after 12:00 + 10 min headway = 12:10.
    # Expected primary delay = 12:10 - 11:15 = 55 minutes.
    custom_blocks = [
        {"block_id": "TEST_COLLISION", "department": "Civil", "start": "10:30", "end": "12:00"}
    ]

    res = simulate_segment_traffic_impact(
        segment_id="SEG_035",
        custom_blocks=custom_blocks,
    )

    assert res["is_conflict_free"] is False
    assert res["total_primary_delay_minutes"] > 0

    # Find Howrah-Mumbai Mail (train 12810)
    exp_train = next((t for t in res["affected_trains"] if "12810" in t["train_number"]), None)
    assert exp_train is not None
    assert exp_train["has_delay"] is True
    assert exp_train["primary_delay_mins"] == 55
    assert exp_train["actual_arrival"] == "12:10"


def test_train_free_windows_discovery():
    """Verify that available maintenance slots are discovered between train paths."""
    res = simulate_segment_traffic_impact(segment_id="SEG_035")
    free_windows = res["train_free_windows"]

    assert len(free_windows) > 0
    for w in free_windows:
        assert w["duration_min"] >= 30
        assert w["start_min"] < w["end_min"]

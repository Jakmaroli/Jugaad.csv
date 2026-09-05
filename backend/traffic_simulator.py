"""
Stochastic Delay Cascade & Traffic Simulation Engine (SIH26027 - Step 4).
Evaluates the operational impact of scheduled maintenance blocks on passenger & freight train timetables.

Features:
1. Calculates unified track possession windows from active maintenance blocks on a segment.
2. Ingests train passages and detects headway-violating collisions (Primary Delay).
3. Models stochastic delay cascading: enforces 10-minute headway spacing for following trains (Cascade Delay).
4. Identifies conflict-free 'train-free windows' for maintenance opportunity discovery.
"""

import os
import sys
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database_schema import get_db_path

TARGET_DATE_STR = "2026-09-08"


def time_to_minutes(dt_str: str) -> int:
    """Convert ISO timestamp string to integer minutes from midnight."""
    try:
        dt = datetime.fromisoformat(dt_str)
        return dt.hour * 60 + dt.minute
    except Exception:
        # Fallback for HH:MM format
        parts = dt_str.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])


def minutes_to_hhmm(minutes: int) -> str:
    """Format minutes from midnight as HH:MM."""
    h, m = divmod(int(minutes), 60)
    return f"{h:02d}:{m:02d}"


def merge_possession_windows(intervals: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """Merge overlapping or contiguous closed possession intervals into unified blocks."""
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_intervals[0]]
    for current in sorted_intervals[1:]:
        prev_start, prev_end = merged[-1]
        if current[0] <= prev_end:
            merged[-1] = (prev_start, max(prev_end, current[1]))
        else:
            merged.append(current)
    return merged


def find_train_free_windows(
    train_intervals_buffered: List[Tuple[int, int]],
    horizon_start: int = 0,
    horizon_end: int = 1440,
    min_window_duration: int = 30,
) -> List[Tuple[int, int]]:
    """Identify contiguous train-free slots on the corridor suitable for maintenance."""
    merged_trains = merge_possession_windows(train_intervals_buffered)
    free_windows = []
    current_time = horizon_start

    for t_start, t_end in merged_trains:
        if t_start > current_time:
            dur = t_start - current_time
            if dur >= min_window_duration:
                free_windows.append((current_time, t_start))
        current_time = max(current_time, t_end)

    if current_time < horizon_end:
        dur = horizon_end - current_time
        if dur >= min_window_duration:
            free_windows.append((current_time, horizon_end))

    return free_windows


def simulate_segment_traffic_impact(
    segment_id: str = "SEG_035",
    custom_blocks: Optional[List[Dict[str, Any]]] = None,
    db_path: Optional[str] = None,
    headway_buffer_minutes: int = 10,
) -> Dict[str, Any]:
    """
    Simulate primary and cascade delay impact for maintenance blocks on a target segment.
    """
    resolved_path = get_db_path(db_path)
    conn = sqlite3.connect(resolved_path)

    # 1. Retrieve maintenance blocks for the segment
    block_intervals = []
    blocks_meta = []

    if custom_blocks is not None:
        # Use user-supplied or simulated custom blocks
        for b in custom_blocks:
            s_min = time_to_minutes(b["start"]) if isinstance(b["start"], str) else int(b["start"])
            e_min = time_to_minutes(b["end"]) if isinstance(b["end"], str) else int(b["end"])
            block_intervals.append((s_min, e_min))
            blocks_meta.append({
                "block_id": b.get("block_id", "CUSTOM_BLOCK"),
                "department": b.get("department", "Custom"),
                "start_min": s_min,
                "end_min": e_min,
                "start_hhmm": minutes_to_hhmm(s_min),
                "end_hhmm": minutes_to_hhmm(e_min),
            })
    else:
        # Query active Sanctioning or Granted blocks from SQLite
        cursor = conn.cursor()
        cursor.execute("""
            SELECT block_id, department, block_type, approved_start, approved_end, status
            FROM bdms_blocks
            WHERE segment_id = ? AND status IN ('Sanctioning', 'Granted')
              AND approved_start IS NOT NULL AND approved_end IS NOT NULL
        """, (segment_id,))
        for b_id, dept, b_type, app_s, app_e, stat in cursor.fetchall():
            s_min = time_to_minutes(app_s)
            e_min = time_to_minutes(app_e)
            block_intervals.append((s_min, e_min))
            blocks_meta.append({
                "block_id": b_id,
                "department": dept,
                "block_type": b_type,
                "status": stat,
                "start_min": s_min,
                "end_min": e_min,
                "start_hhmm": minutes_to_hhmm(s_min),
                "end_hhmm": minutes_to_hhmm(e_min),
            })

    # Merge overlapping block windows
    closed_possession_windows = merge_possession_windows(block_intervals)

    # 2. Retrieve all train passages traversing this segment
    seg_num = int(segment_id.split("_")[1])
    s_km, e_km = float(seg_num - 1), float(seg_num)

    cursor = conn.cursor()
    cursor.execute("""
        SELECT entry_id, train_number, train_name, train_type, scheduled_arrival, scheduled_departure
        FROM coa_timetable
        WHERE route_km_start < ? AND route_km_end > ?
        ORDER BY scheduled_arrival ASC
    """, (e_km, s_km))
    train_rows = cursor.fetchall()
    conn.close()

    trains = []
    train_buffered_windows = []

    for t_id, t_no, t_name, t_type, arr_str, dep_str in train_rows:
        arr_m = time_to_minutes(arr_str)
        dep_m = time_to_minutes(dep_str)
        dur_m = max(5, dep_m - arr_m)

        trains.append({
            "entry_id": t_id,
            "train_number": t_no,
            "train_name": t_name,
            "train_type": t_type,
            "scheduled_arrival_min": arr_m,
            "scheduled_departure_min": dep_m,
            "scheduled_arrival_hhmm": minutes_to_hhmm(arr_m),
            "scheduled_departure_hhmm": minutes_to_hhmm(dep_m),
            "dwell_duration_min": dur_m,
        })
        train_buffered_windows.append((
            max(0, arr_m - headway_buffer_minutes),
            min(1440, dep_m + headway_buffer_minutes),
        ))

    # 3. Simulate Primary and Cascade Delays
    affected_trains = []
    total_primary_delay = 0
    total_cascade_delay = 0

    last_dispatched_departure = -1

    for t in trains:
        sched_arr = t["scheduled_arrival_min"]
        sched_dep = t["scheduled_departure_min"]
        dwell = t["dwell_duration_min"]

        primary_delay = 0
        cascade_delay = 0

        # Check Primary Delay: Does train collide with any closed possession window?
        current_arr = sched_arr

        for w_start, w_end in closed_possession_windows:
            # Buffer: Track cannot receive train until 10 min after possession ends
            earliest_available_entry = w_end + headway_buffer_minutes
            latest_safe_exit = w_start - headway_buffer_minutes

            # Collision condition: train would be on track during buffered closure
            if not (sched_dep <= latest_safe_exit or sched_arr >= earliest_available_entry):
                # Train cannot enter until possession is fully cleared + headway
                if current_arr < earliest_available_entry:
                    delay_from_window = earliest_available_entry - current_arr
                    primary_delay = max(primary_delay, delay_from_window)

        actual_arr_after_primary = sched_arr + primary_delay

        # Check Cascade Delay: Enforce 10-min spacing from preceding departed train
        if last_dispatched_departure != -1:
            earliest_headway_arrival = last_dispatched_departure + headway_buffer_minutes
            if actual_arr_after_primary < earliest_headway_arrival:
                cascade_delay = earliest_headway_arrival - actual_arr_after_primary

        final_actual_arr = actual_arr_after_primary + cascade_delay
        final_actual_dep = final_actual_arr + dwell
        total_delay = final_actual_arr - sched_arr

        last_dispatched_departure = final_actual_dep
        total_primary_delay += primary_delay
        total_cascade_delay += cascade_delay

        affected_trains.append({
            "train_number": t["train_number"],
            "train_name": t["train_name"],
            "train_type": t["train_type"],
            "scheduled_arrival": t["scheduled_arrival_hhmm"],
            "scheduled_departure": t["scheduled_departure_hhmm"],
            "actual_arrival": minutes_to_hhmm(final_actual_arr),
            "actual_departure": minutes_to_hhmm(final_actual_dep),
            "primary_delay_mins": primary_delay,
            "cascade_delay_mins": cascade_delay,
            "total_delay_mins": total_delay,
            "has_delay": total_delay > 0,
        })

    # 4. Find available train-free windows
    train_free_windows = find_train_free_windows(
        train_buffered_windows,
        horizon_start=0,
        horizon_end=1440,
        min_window_duration=30,
    )

    is_conflict_free = (total_primary_delay == 0 and total_cascade_delay == 0)

    return {
        "segment_id": segment_id,
        "is_conflict_free": is_conflict_free,
        "total_primary_delay_minutes": total_primary_delay,
        "total_cascade_delay_minutes": total_cascade_delay,
        "total_delay_minutes": total_primary_delay + total_cascade_delay,
        "closed_possession_windows": [
            {"start_min": s, "end_min": e, "window_str": f"{minutes_to_hhmm(s)} - {minutes_to_hhmm(e)}"}
            for s, e in closed_possession_windows
        ],
        "train_free_windows": [
            {"start_min": s, "end_min": e, "duration_min": e - s, "window_str": f"{minutes_to_hhmm(s)} - {minutes_to_hhmm(e)}"}
            for s, e in train_free_windows
        ],
        "affected_trains": affected_trains,
        "blocks_evaluated": blocks_meta,
    }


if __name__ == "__main__":
    print(f"=== Running Stochastic Traffic Simulation on Segment 35 ===")
    sim_result = simulate_segment_traffic_impact("SEG_035")
    print(f"Conflict Free : {sim_result['is_conflict_free']}")
    print(f"Primary Delay : {sim_result['total_primary_delay_minutes']} mins")
    print(f"Cascade Delay : {sim_result['total_cascade_delay_minutes']} mins")
    print(f"Total Delay   : {sim_result['total_delay_minutes']} mins")
    for t in sim_result["affected_trains"]:
        print(f"  * [{t['train_number']}] {t['train_name']}: Sched {t['scheduled_arrival']} -> Act {t['actual_arrival']} (Delay: {t['total_delay_mins']}m)")

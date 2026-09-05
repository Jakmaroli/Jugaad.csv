"""
Integration tests for mock data generator, row counts, and bottleneck conflicts (SIH26027).
"""

import pytest
from datetime import datetime
from backend.database_schema import (
    get_engine,
    get_table_counts,
    get_session,
    TMSTrackAsset,
    TMSDefect,
    SMMSSignalAsset,
    SMMSFailure,
    TDMSTractionAsset,
    TDMSDefect,
    COATimetable,
    COAFreightForecast,
    BDMSBlock,
    DecisionAudit,
)


def test_exact_table_row_counts():
    """Verify that all tables match the exact expected row counts."""
    counts = get_table_counts()

    expected_counts = {
        "bdms_blocks": 7,
        "coa_freight_forecast": 4,
        "coa_timetable": 121,
        "decision_audit": 4,
        "smms_failures": 46,
        "smms_signal_assets": 200,
        "tdms_defects": 46,
        "tdms_traction_assets": 200,
        "tms_defects": 61,
        "tms_track_assets": 100,
    }

    for table, expected in expected_counts.items():
        actual = counts.get(table, 0)
        if table == "decision_audit":
            assert actual >= expected, (
                f"Table '{table}' has {actual} rows; expected at least {expected} rows."
            )
        else:
            assert actual == expected, (
                f"Table '{table}' has {actual} rows; expected {expected} rows."
            )


def test_total_defect_counts_across_databases():
    """Verify that total defect counts across TMS, SMMS, and TDMS equal exactly 153."""
    counts = get_table_counts()
    total_defects = counts["tms_defects"] + counts["smms_failures"] + counts["tdms_defects"]
    assert total_defects == 153, f"Expected 153 total defects, found {total_defects}."


def test_track_assets_corridor_specifications():
    """Verify track segment range, broad gauge, and Yearly GMT traffic bounds."""
    session = get_session()
    segments = session.query(TMSTrackAsset).all()
    assert len(segments) == 100

    gmts = [s.yearly_gmt for s in segments]
    assert min(gmts) >= 15.0, f"Minimum Yearly GMT {min(gmts)} is below 15.0"
    assert max(gmts) <= 65.0, f"Maximum Yearly GMT {max(gmts)} is above 65.0"

    for seg in segments:
        assert seg.gauge_mm == 1676, f"Segment {seg.segment_id} gauge is not standard Broad Gauge (1676mm)"

    session.close()


def test_segment_35_bottleneck_collision_blocks():
    """Verify the multi-departmental block collision on Segment 35 for 2026-09-08."""
    session = get_session()
    seg35_blocks = session.query(BDMSBlock).filter(BDMSBlock.segment_id == "SEG_035").all()
    assert len(seg35_blocks) == 3, f"Expected 3 conflicting blocks on SEG_035, found {len(seg35_blocks)}"

    block_map = {b.block_id: b for b in seg35_blocks}

    # 1. Engineering Emergency Block
    assert "BLK_ENG_CONFL" in block_map
    b_eng = block_map["BLK_ENG_CONFL"]
    assert b_eng.department == "Engineering"
    assert b_eng.block_type == "Emergency"
    assert b_eng.requested_start == "2026-09-08T10:00:00"
    assert b_eng.requested_end == "2026-09-08T12:00:00"
    assert "rail fracture" in b_eng.work_description.lower()

    # 2. Signal Integrated Block
    assert "BLK_SNT_CONFL" in block_map
    b_snt = block_map["BLK_SNT_CONFL"]
    assert b_snt.department == "Signal"
    assert b_snt.block_type == "Integrated"
    assert b_snt.requested_start == "2026-09-08T10:30:00"
    assert b_snt.requested_end == "2026-09-08T11:30:00"
    assert "switch lock" in b_snt.work_description.lower()

    # 3. Traction Shadow Block
    assert "BLK_TRD_CONFL" in block_map
    b_trd = block_map["BLK_TRD_CONFL"]
    assert b_trd.department == "Traction"
    assert b_trd.block_type == "Shadow"
    assert b_trd.requested_start == "2026-09-08T09:30:00"
    assert b_trd.requested_end == "2026-09-08T11:00:00"
    assert "ohe mast" in b_trd.work_description.lower()

    session.close()


def test_segment_35_timetable_train_collisions():
    """Verify that scheduled trains collide in time with the maintenance windows on Segment 35."""
    session = get_session()
    seg35_trains = (
        session.query(COATimetable)
        .filter(COATimetable.route_km_start >= 34.0, COATimetable.route_km_end <= 35.0)
        .all()
    )
    assert len(seg35_trains) >= 2, f"Expected at least 2 train runs on SEG_035, found {len(seg35_trains)}"

    train_numbers = {t.train_number: t for t in seg35_trains}

    # Express train: Howrah - Mumbai Mail
    assert "12810" in train_numbers, "Howrah - CSMT Mumbai Mail (12810) missing from SEG_035"
    exp = train_numbers["12810"]
    assert exp.train_type == "Express"
    assert exp.scheduled_arrival == "2026-09-08T11:15:00"
    assert exp.scheduled_departure == "2026-09-08T11:25:00"

    # Coal Freight cargo train
    assert "FRT_COAL_35" in train_numbers, "Coal Freight cargo train (FRT_COAL_35) missing from SEG_035"
    frt = train_numbers["FRT_COAL_35"]
    assert frt.train_type == "Freight"
    assert frt.scheduled_arrival == "2026-09-08T09:30:00"
    assert frt.scheduled_departure == "2026-09-08T09:50:00"

    session.close()


def test_decision_audit_log_entries():
    """Verify human-in-the-loop decision audit logging."""
    session = get_session()
    audits = session.query(DecisionAudit).all()
    assert len(audits) >= 4, f"Expected at least 4 audit rows, found {len(audits)}"

    block_ids = {a.block_id for a in audits}
    assert "BLK_ENG_CONFL" in block_ids
    assert "BLK_SNT_CONFL" in block_ids
    assert "BLK_TRD_CONFL" in block_ids

    for a in audits:
        assert a.action in ["Submit", "Approve", "Reschedule", "Override", "Reject", "Sanctioning"]
        assert len(a.actor) > 0
        assert len(a.reason) > 0

    session.close()

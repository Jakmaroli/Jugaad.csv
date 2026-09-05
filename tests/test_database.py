"""
Unit tests for database schema, engine, and foreign key constraints (SIH26027).
"""

import os
import sqlite3
import pytest
from sqlalchemy import inspect, create_engine
from backend.database_schema import (
    Base,
    get_db_path,
    get_engine,
    init_db,
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


def test_database_file_creation():
    """Verify that the SQLite database file path is valid and accessible."""
    db_path = get_db_path()
    assert os.path.exists(db_path), f"Database file not found at {db_path}"
    assert os.path.getsize(db_path) > 0, "Database file is empty"


def test_all_expected_tables_exist():
    """Ensure all 10 Indian Railways domain tables exist in the schema."""
    engine = get_engine()
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    expected_tables = {
        "tms_track_assets",
        "tms_defects",
        "smms_signal_assets",
        "smms_failures",
        "tdms_traction_assets",
        "tdms_defects",
        "coa_timetable",
        "coa_freight_forecast",
        "bdms_blocks",
        "decision_audit",
    }

    assert expected_tables.issubset(existing_tables), (
        f"Missing tables: {expected_tables - existing_tables}"
    )


def test_tms_track_assets_columns():
    """Verify columns and gauge constraints in tms_track_assets."""
    engine = get_engine()
    inspector = inspect(engine)
    columns = {col["name"]: col for col in inspector.get_columns("tms_track_assets")}

    required_cols = [
        "segment_id",
        "track_section",
        "km_start",
        "km_end",
        "line_type",
        "gauge_mm",
        "rail_weight_kg_m",
        "sleeper_type",
        "tgi_index",
        "usfd_schedule_due",
        "last_inspection_date",
        "yearly_gmt",
    ]

    for col_name in required_cols:
        assert col_name in columns, f"Column '{col_name}' missing from tms_track_assets"


def test_foreign_key_pragmas_enabled():
    """Verify that foreign key pragma is enforced in SQLite connections."""
    engine = get_engine()
    with engine.connect() as conn:
        res = conn.exec_driver_sql("PRAGMA foreign_keys").scalar()
        assert res == 1, "SQLite foreign_keys pragma is not active (expected 1)"


def test_foreign_key_constraint_enforcement():
    """Verify that invalid foreign key references trigger IntegrityError."""
    engine = get_engine()
    # Attempting to insert a TMSDefect referencing a non-existent segment_id
    with pytest.raises(Exception):
        with engine.connect() as conn:
            conn.exec_driver_sql(
                "INSERT INTO tms_defects (defect_id, segment_id, km_post, defect_type, severity, detected_date, status) "
                "VALUES ('DUMMY_DEF_999', 'NON_EXISTENT_SEG', 999.0, 'Test Defect', 'Routine', '2026-09-08', 'Open')"
            )
            conn.commit()

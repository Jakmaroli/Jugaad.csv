"""
Relational Database Schema for AI-Assisted Block Planning Decision-Support System (SIH26027).
Defines SQLite database models using SQLAlchemy representing Indian Railways domain schemas:
- TMS (Track Management System): tms_track_assets, tms_defects
- SMMS (Signal Maintenance Management System): smms_signal_assets, smms_failures
- TDMS (Traction Distribution Management System): tdms_traction_assets, tdms_defects
- COA (Control Office Application): coa_timetable, coa_freight_forecast
- BDMS (Block Demand & Management System): bdms_blocks
- Decision Audit: decision_audit (Human-in-the-Loop tracking)
"""

import os
import sqlite3
from typing import Dict, Optional
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    ForeignKey,
    create_engine,
    event,
    inspect,
    text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enforce foreign key constraints on SQLite connections."""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# -----------------------------------------------------------------------------
# 1. TMS (Track Management System)
# -----------------------------------------------------------------------------
class TMSTrackAsset(Base):
    """
    Physical track asset data including broad gauge specifications (1676mm),
    Track Geometry Index (TGI) averages, USFD schedules, and active PSRs.
    """
    __tablename__ = "tms_track_assets"

    segment_id = Column(String(20), primary_key=True)  # e.g., 'SEG_001'
    track_section = Column(String(100), nullable=False)
    km_start = Column(Float, nullable=False)
    km_end = Column(Float, nullable=False)
    line_type = Column(String(20), default="UP")  # UP, DOWN, Single
    gauge_mm = Column(Integer, default=1676)  # Standard Broad Gauge 1676mm
    rail_weight_kg_m = Column(Float, default=60.0)  # 60 kg/m UIC
    sleeper_type = Column(String(50), default="PSC")  # Prestressed Concrete Sleepers
    tgi_index = Column(Float, nullable=False)  # Track Geometry Index (e.g. 40 - 100)
    usfd_schedule_due = Column(String(30), nullable=False)  # Ultrasonic Flaw Detection due date
    last_inspection_date = Column(String(30), nullable=False)
    active_psr_km = Column(Float, nullable=True)  # Location of Permanent Speed Restriction
    psr_speed_kmph = Column(Integer, nullable=True)  # Speed limit under PSR
    yearly_gmt = Column(Float, nullable=False)  # Gross Million Tonnes traffic density (15.0 - 65.0)

    # Relationships
    defects = relationship("TMSDefect", back_populates="track_asset", cascade="all, delete-orphan")
    blocks = relationship("BDMSBlock", back_populates="track_asset")


class TMSDefect(Base):
    """
    Geotagged raw track anomalies (TGI deviations, rail fractures, USFD flaws, sleeper distress).
    """
    __tablename__ = "tms_defects"

    defect_id = Column(String(30), primary_key=True)  # e.g., 'TMS_DEF_001'
    segment_id = Column(String(20), ForeignKey("tms_track_assets.segment_id"), nullable=False)
    km_post = Column(Float, nullable=False)
    defect_type = Column(String(100), nullable=False)  # Rail fracture, USFD flaw, TGI deviation, Sleeper distress
    severity = Column(String(20), nullable=False)  # Routine, Priority, Express
    detected_date = Column(String(30), nullable=False)
    status = Column(String(30), default="Open")  # Open, In-Progress, Rectified
    suggested_action = Column(String(200), nullable=True)

    # Relationships
    track_asset = relationship("TMSTrackAsset", back_populates="defects")


# -----------------------------------------------------------------------------
# 2. SMMS (Signal Maintenance Management System)
# -----------------------------------------------------------------------------
class SMMSSignalAsset(Base):
    """
    Point machines, signal posts, track circuits, and axle counters along corridor.
    """
    __tablename__ = "smms_signal_assets"

    asset_id = Column(String(30), primary_key=True)  # e.g., 'SIG_001'
    segment_id = Column(String(20), ForeignKey("tms_track_assets.segment_id"), nullable=False)
    asset_type = Column(String(50), nullable=False)  # Point Machine, Signal Post, Track Circuit, Axle Counter
    station_code = Column(String(20), nullable=False)
    location_km = Column(Float, nullable=False)
    install_date = Column(String(30), nullable=False)
    last_maintenance_date = Column(String(30), nullable=False)
    operational_status = Column(String(30), default="Operational")  # Operational, Degraded, Failed

    # Relationships
    failures = relationship("SMMSFailure", back_populates="signal_asset", cascade="all, delete-orphan")


class SMMSFailure(Base):
    """
    Daily fault logs reported by signal supervisors via field tablets.
    """
    __tablename__ = "smms_failures"

    failure_id = Column(String(30), primary_key=True)  # e.g., 'FAIL_SIG_001'
    asset_id = Column(String(30), ForeignKey("smms_signal_assets.asset_id"), nullable=False)
    segment_id = Column(String(20), ForeignKey("tms_track_assets.segment_id"), nullable=False)
    failure_type = Column(String(100), nullable=False)  # Switch lock failure, Signal lamp failure, Track circuit drop
    severity = Column(String(20), nullable=False)  # Routine, Priority, Express
    failure_time = Column(String(30), nullable=False)
    rectification_status = Column(String(30), default="Logged")  # Logged, Attended, Resolved
    remarks = Column(String(250), nullable=True)

    # Relationships
    signal_asset = relationship("SMMSSignalAsset", back_populates="failures")


# -----------------------------------------------------------------------------
# 3. TDMS (Traction Distribution Management System)
# -----------------------------------------------------------------------------
class TDMSTractionAsset(Base):
    """
    OHE (Overhead Equipment) masts, substations, and contact wire wear.
    """
    __tablename__ = "tdms_traction_assets"

    asset_id = Column(String(30), primary_key=True)  # e.g., 'OHE_001'
    segment_id = Column(String(20), ForeignKey("tms_track_assets.segment_id"), nullable=False)
    asset_type = Column(String(50), nullable=False)  # OHE Mast, Substation, Cantilever, Section Insulator
    mast_number = Column(String(30), nullable=False)
    location_km = Column(Float, nullable=False)
    contact_wire_wear_pct = Column(Float, nullable=False)  # e.g., 5.0% - 25.0%
    last_panto_inspection = Column(String(30), nullable=False)
    status = Column(String(30), default="Normal")  # Normal, Attention, Critical

    # Relationships
    defects = relationship("TDMSDefect", back_populates="traction_asset", cascade="all, delete-orphan")


class TDMSDefect(Base):
    """
    Traction defect logs reported across corridor.
    """
    __tablename__ = "tdms_defects"

    defect_id = Column(String(30), primary_key=True)  # e.g., 'TRD_DEF_001'
    asset_id = Column(String(30), ForeignKey("tdms_traction_assets.asset_id"), nullable=False)
    segment_id = Column(String(20), ForeignKey("tms_track_assets.segment_id"), nullable=False)
    defect_type = Column(String(100), nullable=False)  # Misaligned OHE mast, Contact wire wear, Insulator flashover
    severity = Column(String(20), nullable=False)  # Routine, Priority, Express
    detected_date = Column(String(30), nullable=False)
    status = Column(String(30), default="Open")  # Open, Scheduled, Rectified

    # Relationships
    traction_asset = relationship("TDMSTractionAsset", back_populates="defects")


# -----------------------------------------------------------------------------
# 4. COA (Control Office Application) Timetable & Freight
# -----------------------------------------------------------------------------
class COATimetable(Base):
    """
    Master passenger and freight train schedules across the corridor.
    """
    __tablename__ = "coa_timetable"

    entry_id = Column(String(30), primary_key=True)  # e.g., 'COA_TT_001'
    train_number = Column(String(20), nullable=False)
    train_name = Column(String(100), nullable=False)
    train_type = Column(String(30), nullable=False)  # Express, Mail, Passenger, Freight
    route_km_start = Column(Float, nullable=False)
    route_km_end = Column(Float, nullable=False)
    scheduled_arrival = Column(String(30), nullable=False)  # ISO timestamp
    scheduled_departure = Column(String(30), nullable=False)  # ISO timestamp
    source_station = Column(String(50), nullable=False)
    dest_station = Column(String(50), nullable=False)
    priority_rank = Column(Integer, default=1)  # 1 (Highest priority - Rajdhani/Mail) to 5 (Freight)


class COAFreightForecast(Base):
    """
    Fluctuating goods train forecasts ingested from Control Office Application.
    """
    __tablename__ = "coa_freight_forecast"

    forecast_id = Column(String(30), primary_key=True)  # e.g., 'FRT_FC_001'
    rake_id = Column(String(30), nullable=False)
    freight_commodity = Column(String(50), nullable=False)  # Coal, Iron Ore, Container, Fertilizer
    source_terminal = Column(String(50), nullable=False)
    destination_terminal = Column(String(50), nullable=False)
    expected_corridor_entry = Column(String(30), nullable=False)
    expected_corridor_exit = Column(String(30), nullable=False)
    speed_potential_kmph = Column(Integer, default=75)
    gross_tonnage = Column(Float, nullable=False)


# -----------------------------------------------------------------------------
# 5. BDMS (Block Demand & Management System)
# -----------------------------------------------------------------------------
class BDMSBlock(Base):
    """
    Primary table for scheduling maintenance blocks.
    Maintains checking rules on block types (Shadow, Integrated, Emergency)
    and life cycle states (Draft, Verification, Submission, Sanctioning, Granted, Closed, Rejected).
    """
    __tablename__ = "bdms_blocks"

    block_id = Column(String(30), primary_key=True)  # e.g., 'BLK_ENG_CONFL'
    department = Column(String(30), nullable=False)  # Engineering, Signal, Traction
    block_type = Column(String(30), nullable=False)  # Shadow, Integrated, Emergency
    status = Column(String(30), nullable=False, default="Submission")  # Draft, Verification, Submission, Sanctioning, Granted, Closed, Rejected
    segment_id = Column(String(20), ForeignKey("tms_track_assets.segment_id"), nullable=False)
    km_start = Column(Float, nullable=False)
    km_end = Column(Float, nullable=False)
    requested_start = Column(String(30), nullable=False)  # ISO timestamp
    requested_end = Column(String(30), nullable=False)  # ISO timestamp
    approved_start = Column(String(30), nullable=True)
    approved_end = Column(String(30), nullable=True)
    work_description = Column(String(250), nullable=False)
    resource_details = Column(String(200), nullable=True)
    created_at = Column(String(30), nullable=False)
    priority_weight = Column(Float, nullable=True, default=5.0)  # Prioritization score (0 - 100)

    # Relationships
    track_asset = relationship("TMSTrackAsset", back_populates="blocks")
    audit_entries = relationship("DecisionAudit", back_populates="block", cascade="all, delete-orphan")


# -----------------------------------------------------------------------------
# 6. Decision Audit (Human-in-the-Loop Tracking)
# -----------------------------------------------------------------------------
class DecisionAudit(Base):
    """
    Implements 'Human-in-the-Loop' tracking by logging the exact action, actor,
    timestamp, and reason for every approve, reschedule, or override event.
    """
    __tablename__ = "decision_audit"

    audit_id = Column(String(30), primary_key=True)  # e.g., 'AUDIT_001'
    block_id = Column(String(30), ForeignKey("bdms_blocks.block_id"), nullable=False)
    action = Column(String(50), nullable=False)  # Approve, Reschedule, Override, Reject, Submit
    actor = Column(String(100), nullable=False)  # e.g., 'Section Controller SC_01', 'Dy. Chief Controller'
    timestamp = Column(String(30), nullable=False)
    reason = Column(String(250), nullable=False)
    previous_state = Column(String(50), nullable=False)
    new_state = Column(String(50), nullable=False)

    # Relationships
    block = relationship("BDMSBlock", back_populates="audit_entries")


# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
def get_db_path(custom_path: Optional[str] = None) -> str:
    """Return absolute path to SQLite database file."""
    if custom_path:
        return os.path.abspath(custom_path)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "block_planning.db")


def get_engine(db_path: Optional[str] = None) -> Engine:
    """Create and return SQLAlchemy Engine for SQLite database."""
    resolved_path = get_db_path(db_path)
    engine = create_engine(f"sqlite:///{resolved_path}", echo=False)
    return engine


def get_session(engine: Optional[Engine] = None):
    """Return a scoped database session."""
    eng = engine or get_engine()
    Session = sessionmaker(bind=eng)
    return Session()


def init_db(db_path: Optional[str] = None) -> Engine:
    """Initialize SQLite database tables according to schema."""
    engine = get_engine(db_path)
    Base.metadata.create_all(engine)
    return engine


def get_table_counts(engine: Optional[Engine] = None) -> Dict[str, int]:
    """Return row counts for all database tables."""
    eng = engine or get_engine()
    table_names = [
        "bdms_blocks",
        "coa_freight_forecast",
        "coa_timetable",
        "decision_audit",
        "smms_failures",
        "smms_signal_assets",
        "tdms_defects",
        "tdms_traction_assets",
        "tms_defects",
        "tms_track_assets",
    ]
    counts = {}
    with eng.connect() as conn:
        for t in table_names:
            try:
                res = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                counts[t] = res or 0
            except Exception:
                counts[t] = 0
    return counts


if __name__ == "__main__":
    db_file = get_db_path()
    print(f"Initializing database at: {db_file}")
    engine = init_db(db_file)
    print("Database tables initialized successfully.")
    counts = get_table_counts(engine)
    print("Current row counts:")
    for tbl, count in sorted(counts.items()):
        print(f"  {tbl:25}: {count} rows")

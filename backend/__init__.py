"""
Backend Persistence Layer for SIH26027 Block Planning System.
Houses database_schema, mock_data_generator, config, and the canonical
implementations of the solver / ML risk / simulator logic that the
`solver`, `ml_risk_engine`, and `simulator` packages expose at the top level.

NOTE ON PACKAGE STRUCTURE: This package intentionally does NOT eagerly
re-export names from the sibling `solver`, `ml_risk_engine`, or `simulator`
packages. Those packages' submodules import directly from
`backend.database_schema` / `backend.config` / `backend.block_solver`, etc.
If `backend/__init__.py` also eagerly imported names *from* those sibling
packages, importing `simulator` (or `solver`/`ml_risk_engine`) before
anything imports `backend` first creates a circular import: Python starts
executing `backend/__init__.py` mid-way through the sibling package's own
`__init__.py`, and the sibling's names aren't bound yet. Keeping this file
minimal avoids that trap entirely. Import what you need directly from
`backend.<module>`, `solver`, `ml_risk_engine`, or `simulator`.
"""

import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
    "get_db_path",
    "get_engine",
    "get_session",
    "init_db",
    "get_table_counts",
    "inject_emergency_defect",
    "TARGET_DATE_STR",
]

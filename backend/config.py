"""
Central Configuration and Operating Parameters for SIH26027.
Eliminates magic strings and provides single source of truth for operational horizon.
"""

import os

# Operational Scheduling Horizon
TARGET_DATE_STR = "2026-09-08"
SCHEDULE_HORIZON_MINUTES = 1440
DEFAULT_HEADWAY_BUFFER_MINUTES = 10
MAX_SHIFT_MINUTES = 180

# Base directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUT_DIR = os.path.join(BASE_DIR, "out")
DB_NAME = "block_planning.db"
DEFAULT_DB_PATH = os.path.join(DATA_DIR, DB_NAME)

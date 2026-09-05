# AI-Assisted Block Planning Decision-Support System (SIH26027)

An intelligent, multi-departmental corridor scheduling and decision-support platform designed for Indian Railways Section Controllers. The system detects conflicting maintenance requests across Engineering, Signaling, and Traction, integrates with train timetable movements, and formulates conflict-free block recommendations using constraint optimization.

---

## 1. Project Framing: Human-in-the-Loop Decision Support

> **AI-assisted decision support for block sanctioning** — it detects conflicts, ranks urgency, and proposes an optimized schedule in seconds instead of hours. The Section Controller still clicks "Approve."

This architecture maintains strict regulatory compliance:
- **No autonomous track closures**: Safety decisions remain anchored in human controllers.
- **Explainable recommendations**: Transparent risk weights and constraint satisfaction.
- **Complete audit trail**: Every approval, rescheduling, and override is permanently recorded in `decision_audit`.

---

## 2. Data Provenance Disclosure

> **Note on Data Provenance:**
> This repository uses high-fidelity simulated telemetry structured to match the real schemas of Indian Railways' **TMS** (Track Management System), **SMMS** (Signal Maintenance Management System), **TDMS** (Traction Distribution Management System), and **COA** (Control Office Application). The schema and data layer are built directly against these official standards so that the pipeline and decision engine can ingest live Indian Railways feeds or CSV/API exports when authorized.

---

## 3. Directory Layout

```
.
├── backend/                    # Core database schemas, engines, and generators
│   ├── __init__.py
│   ├── database_schema.py      # SQLAlchemy models & SQLite engine
│   └── mock_data_generator.py  # Corridor generator & conflict scenario seed
├── frontend/                   # Streamlit advisory dashboard files (Step 5)
│   └── README.md
├── data/                       # Active SQLite database file
│   └── block_planning.db
├── docs/                       # Technical design & domain specifications
│   ├── data_dictionary.md      # Field-level Indian Railways schema dictionary
│   └── system_architecture.md  # Architectural diagrams & conflict workflow
├── tests/                      # Unit and integration test suite
│   ├── __init__.py
│   ├── test_database.py        # Schema & foreign key tests
│   └── test_mock_data.py       # Exact row count & conflict verification tests
├── .gitignore                  # Git pattern ignore configuration
├── README.md                   # System manual & operational guide
├── requirements.txt            # Production dependencies
└── sih26027_block_planning_guide.md # Hardened build blueprint
```

---

## 4. Setup & Execution

### Prerequisites
- Python 3.12+
- Pinned packages listed in `requirements.txt` (`sqlalchemy`, `ortools`, `pandas`, `numpy`, `scikit-learn`, `xgboost`, `streamlit`, `plotly`, `pytest`).

### 1. Initialize Database Schema
To create the SQLite database tables with enforced foreign keys:
```powershell
python backend/database_schema.py
```

### 2. Populate High-Fidelity Mock Telemetry & Conflicts
To populate the 100km corridor (Segments `SEG_001` through `SEG_100`) with fixed seed `42`:
```powershell
python backend/mock_data_generator.py
```

### 3. Run Automated Validation Tests
Run the comprehensive test suite to verify table counts, foreign keys, and bottleneck collisions:
```powershell
pytest -v tests/
```

---

## 5. Verified Database Counts

When `backend/mock_data_generator.py` executes, it establishes the following exact database counts:

| Table | Count | Description |
|---|---|---|
| `tms_track_assets` | 100 rows | 100 corridor segments with 15.0–65.0 GMT, 1676mm gauge, TGI, USFD |
| `tms_defects` | 61 rows | Geotagged anomalies (including Km 34.4 rail fracture) |
| `smms_signal_assets` | 200 rows | Point machines, signal posts, track circuits, axle counters |
| `smms_failures` | 46 rows | Field supervisor failure logs (including PM-35 switch lock failure) |
| `tdms_traction_assets` | 200 rows | OHE masts and substations |
| `tdms_defects` | 46 rows | Traction defects (including OHE-35 cantilever misalignment) |
| `coa_timetable` | 121 rows | Corridor passenger and freight movements on 2026-09-08 |
| `coa_freight_forecast` | 4 rows | Fluctuating heavy-haul goods forecasts (Coal, Ore, Fertilizer, Container) |
| `bdms_blocks` | 7 rows | 3 conflicting blocks on Seg 35 + 4 non-conflicting corridor blocks |
| `decision_audit` | 4 rows | Human-in-the-loop action and justification logs |

**Total Defects**: `61` (TMS) + `46` (SMMS) + `46` (TDMS) = **153 defects**.

---

## 6. Bottleneck Collision Benchmark (Segment 35)

On the operational target date **Tuesday, Sep 8, 2026**, the system seeds a complex multi-departmental bottleneck on **Segment 35 (Km 34.0–35.0)**:
1. **Engineering (`BLK_ENG_CONFL`)**: Emergency block (`10:00 - 12:00`) to replace severe rail fracture (`TMS_DEF_035`).
2. **Signal (`BLK_SNT_CONFL`)**: Integrated block (`10:30 - 11:30`) to repair switch lock failure on Point Machine PM-35 (`FAIL_SIG_035`).
3. **Traction (`BLK_TRD_CONFL`)**: Shadow block (`09:30 - 11:00`) to realign OHE mast cantilever (`TRD_DEF_035`).
4. **Train Collisions (`coa_timetable`)**:
   - **Express Train (12810 Howrah - CSMT Mumbai Mail)**: Occupying Seg 35 from `11:15` to `11:25`.
   - **Coal Freight Cargo Train**: Occupying Seg 35 from `09:30` to `09:50`.

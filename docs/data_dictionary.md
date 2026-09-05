# SIH26027 Data Dictionary & Schema Specification

This document details the relational database schema implemented in `data/block_planning.db` for the AI-Assisted Block Planning Decision-Support System. The schema mirrors the production systems utilized across Indian Railways.

---

## 1. TMS (Track Management System)

### Table: `tms_track_assets`
Maintains structural track telemetry across corridor segments.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `segment_id` | VARCHAR(20) | PRIMARY KEY | Unique segment code (e.g., `SEG_001` - `SEG_100`). |
| `track_section` | VARCHAR(100) | NOT NULL | Section name and kilometer boundaries. |
| `km_start` | FLOAT | NOT NULL | Start kilometer of track segment. |
| `km_end` | FLOAT | NOT NULL | End kilometer of track segment. |
| `line_type` | VARCHAR(20) | NOT NULL | Directional classification (`UP`, `DOWN`, `Single`). |
| `gauge_mm` | INTEGER | NOT NULL | Track gauge in millimeters (Standard Indian Broad Gauge = `1676`). |
| `rail_weight_kg_m` | FLOAT | NOT NULL | Weight profile of rail (`60.0` kg/m UIC). |
| `sleeper_type` | VARCHAR(50) | NOT NULL | Sleeper material (`PSC` - Pre-stressed Concrete). |
| `tgi_index` | FLOAT | NOT NULL | Track Geometry Index composite score (40–100). Scores < 60 denote poor track condition. |
| `usfd_schedule_due`| VARCHAR(30) | NOT NULL | Due date for periodic Ultrasonic Flaw Detection test. |
| `last_inspection_date`| VARCHAR(30) | NOT NULL | Timestamp of last recorded track inspection. |
| `active_psr_km` | FLOAT | NULLABLE | Kilometer post of active Permanent Speed Restriction (if any). |
| `psr_speed_kmph` | INTEGER | NULLABLE | Speed ceiling enforced by PSR (e.g., 30, 45, 60 km/h). |
| `yearly_gmt` | FLOAT | NOT NULL | Traffic density in Gross Million Tonnes per annum (15.0 – 65.0). |

### Table: `tms_defects`
Logs track anomalies identified by foot patrols, track recording cars, or USFD inspection.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `defect_id` | VARCHAR(30) | PRIMARY KEY | Unique defect identifier (e.g., `TMS_DEF_035`). |
| `segment_id` | VARCHAR(20) | FOREIGN KEY | References `tms_track_assets.segment_id`. |
| `km_post` | FLOAT | NOT NULL | Exact kilometer post of defect location. |
| `defect_type` | VARCHAR(100) | NOT NULL | Defect description (`Severe Rail Fracture`, `TGI Geometry Deviation`, `USFD Flaw Detected`). |
| `severity` | VARCHAR(20) | NOT NULL | Urgency class: `Routine`, `Priority`, `Express`. |
| `detected_date` | VARCHAR(30) | NOT NULL | ISO-8601 timestamp of defect logging. |
| `status` | VARCHAR(30) | NOT NULL | Status: `Open`, `In-Progress`, `Rectified`. |
| `suggested_action`| VARCHAR(200) | NULLABLE | Recommended engineering intervention. |

---

## 2. SMMS (Signal Maintenance Management System)

### Table: `smms_signal_assets`
Tracks critical interlocking, signaling, and train detection assets.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `asset_id` | VARCHAR(30) | PRIMARY KEY | Unique signal equipment ID (e.g., `SIG_001`). |
| `segment_id` | VARCHAR(20) | FOREIGN KEY | References `tms_track_assets.segment_id`. |
| `asset_type` | VARCHAR(50) | NOT NULL | Type: `Point Machine`, `Signal Post`, `Track Circuit`, `Axle Counter`. |
| `station_code` | VARCHAR(20) | NOT NULL | Assigned station or interlocked cabin code (e.g., `JGM`, `KGP`). |
| `location_km` | FLOAT | NOT NULL | Kilometer coordinate of equipment. |
| `install_date` | VARCHAR(30) | NOT NULL | Commissioning date. |
| `last_maintenance_date`| VARCHAR(30) | NOT NULL | Date of previous scheduled maintenance overhaul. |
| `operational_status` | VARCHAR(30) | NOT NULL | Operational health: `Operational`, `Degraded`, `Failed`. |

### Table: `smms_failures`
Maintains daily failure incidents recorded by Signal Supervisors.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `failure_id` | VARCHAR(30) | PRIMARY KEY | Unique signal failure incident ID (e.g., `FAIL_SIG_035`). |
| `asset_id` | VARCHAR(30) | FOREIGN KEY | References `smms_signal_assets.asset_id`. |
| `segment_id` | VARCHAR(20) | FOREIGN KEY | References `tms_track_assets.segment_id`. |
| `failure_type` | VARCHAR(100) | NOT NULL | Failure mode (e.g., `Switch lock detection failure on Point Machine`). |
| `severity` | VARCHAR(20) | NOT NULL | Impact rating: `Routine`, `Priority`, `Express`. |
| `failure_time` | VARCHAR(30) | NOT NULL | ISO timestamp of failure occurrence. |
| `rectification_status`| VARCHAR(30) | NOT NULL | Workflow state: `Logged`, `Attended`, `Resolved`. |
| `remarks` | VARCHAR(250) | NULLABLE | Field inspector diagnostic notes. |

---

## 3. TDMS (Traction Distribution Management System)

### Table: `tdms_traction_assets`
Manages 25kV AC Overhead Equipment (OHE) infrastructure.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `asset_id` | VARCHAR(30) | PRIMARY KEY | Traction asset identifier (e.g., `OHE_001`). |
| `segment_id` | VARCHAR(20) | FOREIGN KEY | References `tms_track_assets.segment_id`. |
| `asset_type` | VARCHAR(50) | NOT NULL | Infrastructure type: `OHE Mast`, `Substation`, `Cantilever Assembly`. |
| `mast_number` | VARCHAR(30) | NOT NULL | Trackside mast designation plate (e.g., `M-35/14`). |
| `location_km` | FLOAT | NOT NULL | Kilometer location of traction mast. |
| `contact_wire_wear_pct` | FLOAT | NOT NULL | Contact wire cross-sectional wear percentage (%). |
| `last_panto_inspection`| VARCHAR(30) | NOT NULL | Date of last pantograph interaction recording run. |
| `status` | VARCHAR(30) | NOT NULL | Physical state: `Normal`, `Attention`, `Critical`. |

### Table: `tdms_defects`
Maintains records of mechanical, electrical, and alignment anomalies in OHE traction.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `defect_id` | VARCHAR(30) | PRIMARY KEY | Unique traction defect identifier (e.g., `TRD_DEF_035`). |
| `asset_id` | VARCHAR(30) | FOREIGN KEY | References `tdms_traction_assets.asset_id`. |
| `segment_id` | VARCHAR(20) | FOREIGN KEY | References `tms_track_assets.segment_id`. |
| `defect_type` | VARCHAR(100) | NOT NULL | Defect description (e.g., `Misaligned OHE mast cantilever`). |
| `severity` | VARCHAR(20) | NOT NULL | Urgency class: `Routine`, `Priority`, `Express`. |
| `detected_date` | VARCHAR(30) | NOT NULL | ISO timestamp when anomaly was reported. |
| `status` | VARCHAR(30) | NOT NULL | Status: `Open`, `Scheduled`, `Rectified`. |

---

## 4. COA (Control Office Application)

### Table: `coa_timetable`
Corridor movement schedule for passenger trains, express mail, and freight rakes.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `entry_id` | VARCHAR(30) | PRIMARY KEY | Timetable entry primary key (e.g., `COA_TT_001`). |
| `train_number` | VARCHAR(20) | NOT NULL | Official Indian Railways train number (e.g., `12810`). |
| `train_name` | VARCHAR(100) | NOT NULL | Train designation (e.g., `Howrah - CSMT Mumbai Mail`). |
| `train_type` | VARCHAR(30) | NOT NULL | Category: `Express`, `Mail`, `Passenger`, `Freight`. |
| `route_km_start` | FLOAT | NOT NULL | Kilometer entry into the corridor segment. |
| `route_km_end` | FLOAT | NOT NULL | Kilometer exit from the corridor segment. |
| `scheduled_arrival` | VARCHAR(30) | NOT NULL | ISO timestamp of train arrival at segment boundary. |
| `scheduled_departure`| VARCHAR(30) | NOT NULL | ISO timestamp of train departure from segment boundary. |
| `source_station` | VARCHAR(50) | NOT NULL | Origin station of train route. |
| `dest_station` | VARCHAR(50) | NOT NULL | Destination terminal station. |
| `priority_rank` | INTEGER | NOT NULL | Dispatch priority: `1` (Rajdhani/Vande Bharat/Mail), `2` (Superfast), `3` (Local), `4-5` (Freight). |

### Table: `coa_freight_forecast`
Real-time freight cargo forecasts tracking high-tonnage rakes.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `forecast_id` | VARCHAR(30) | PRIMARY KEY | Forecast record identifier (e.g., `FRT_FC_001`). |
| `rake_id` | VARCHAR(30) | NOT NULL | Rake classification ID (e.g., `BOXN_9921`). |
| `freight_commodity` | VARCHAR(50) | NOT NULL | Cargo type (`Coal`, `Iron Ore`, `Fertilizer`, `Container`). |
| `source_terminal` | VARCHAR(50) | NOT NULL | Freight origin loading point. |
| `destination_terminal`| VARCHAR(50) | NOT NULL | Unloading siding/destination. |
| `expected_corridor_entry`| VARCHAR(30)| NOT NULL | Estimated entry timestamp into corridor. |
| `expected_corridor_exit` | VARCHAR(30)| NOT NULL | Estimated exit timestamp from corridor. |
| `speed_potential_kmph` | INTEGER | NOT NULL | Maximum operational speed capability (km/h). |
| `gross_tonnage` | FLOAT | NOT NULL | Loaded gross trailing load in metric tonnes. |

---

## 5. BDMS (Block Demand & Management System)

### Table: `bdms_blocks`
Stores departmental requisitions and final sanctioned time-slots for maintenance blocks.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `block_id` | VARCHAR(30) | PRIMARY KEY | Unique block requisition ID (e.g., `BLK_ENG_CONFL`). |
| `department` | VARCHAR(30) | NOT NULL | Requisitioning department (`Engineering`, `Signal`, `Traction`). |
| `block_type` | VARCHAR(30) | NOT NULL | Block classification: `Emergency`, `Integrated`, `Shadow`. |
| `status` | VARCHAR(30) | NOT NULL | Lifecycle state: `Draft`, `Verification`, `Submission`, `Sanctioning`, `Granted`, `Closed`, `Rejected`. |
| `segment_id` | VARCHAR(20) | FOREIGN KEY | References `tms_track_assets.segment_id`. |
| `km_start` | FLOAT | NOT NULL | Start kilometer of demanded track closure. |
| `km_end` | FLOAT | NOT NULL | End kilometer of demanded track closure. |
| `requested_start` | VARCHAR(30) | NOT NULL | Start timestamp requested by field department. |
| `requested_end` | VARCHAR(30) | NOT NULL | End timestamp requested by field department. |
| `approved_start` | VARCHAR(30) | NULLABLE | Solved/sanctioned start timestamp. |
| `approved_end` | VARCHAR(30) | NULLABLE | Solved/sanctioned end timestamp. |
| `work_description` | VARCHAR(250) | NOT NULL | Operational maintenance task summary. |
| `resource_details` | VARCHAR(200) | NULLABLE | Heavy machinery, squads, and track machines deployed. |
| `created_at` | VARCHAR(30) | NOT NULL | Timestamp when block request was initiated. |

---

## 6. Decision Audit (Human-in-the-Loop)

### Table: `decision_audit`
Guarantees full regulatory transparency and accountability for every block decision.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `audit_id` | VARCHAR(30) | PRIMARY KEY | Unique audit trail entry (e.g., `AUDIT_001`). |
| `block_id` | VARCHAR(30) | FOREIGN KEY | References `bdms_blocks.block_id`. |
| `action` | VARCHAR(50) | NOT NULL | Decision type (`Submit`, `Approve`, `Reschedule`, `Override`, `Reject`). |
| `actor` | VARCHAR(100) | NOT NULL | Identity/role of decision-maker (e.g., `Section Controller SC_01`). |
| `timestamp` | VARCHAR(30) | NOT NULL | Exact ISO timestamp when action was executed. |
| `reason` | VARCHAR(250) | NOT NULL | Operational justification or constraint reason. |
| `previous_state` | VARCHAR(50) | NOT NULL | State before decision (e.g., `Submission`). |
| `new_state` | VARCHAR(50) | NOT NULL | State after decision (e.g., `Granted`). |

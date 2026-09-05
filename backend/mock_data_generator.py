"""
High-Fidelity Mock Telemetry, Assets, Timetables, and Conflict Generator (SIH26027).
Populates the SQLite database (data/block_planning.db) for a 100km corridor (SEG_001 - SEG_100).
Uses a fixed random seed (42) to guarantee reproducible datasets.

Key highlights:
- 100 Track Segments with 15.0 - 65.0 Yearly GMT, TGI, USFD, and PSRs.
- 200 Signaling Assets + 46 Signal Failures.
- 200 Traction Assets + 46 Traction Defects.
- 100 Track Assets + 61 Track Defects (Total 153 defects across TMS, SMMS, TDMS).
- 121 Master Timetable Train Passages for Tuesday, Sep 8, 2026.
- 4 Fluctuating Freight Forecasts from COA.
- Bottleneck Collision on Segment 35 (Km 34.0–35.0):
  * BLK_ENG_CONFL (Emergency, 10:00-12:00) for severe rail fracture
  * BLK_SNT_CONFL (Integrated, 10:30-11:30) for switch lock failure
  * BLK_TRD_CONFL (Shadow, 09:30-11:00) for misaligned OHE mast
  * Timetable conflicts: Express Train (11:15-11:25) & Coal Freight (09:30-09:50)
- 4 Human-in-the-Loop Decision Audit records.
"""

import random
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.engine import Engine
import os
import sys

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database_schema import (
    get_engine,
    init_db,
    get_session,
    get_table_counts,
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

# Seed for absolute reproducibility
RANDOM_SEED = 42
TARGET_DATE_STR = "2026-09-08"


def populate_corridor_data(engine: Optional[Engine] = None, seed: int = RANDOM_SEED):
    """Populate database with synthetic data matching SIH26027 requirements."""
    random.seed(seed)
    eng = engine or get_engine()
    init_db()  # Ensure tables exist
    session = get_session(eng)

    # Clean existing data to ensure clean slate and exact row counts
    session.query(DecisionAudit).delete()
    session.query(BDMSBlock).delete()
    session.query(COAFreightForecast).delete()
    session.query(COATimetable).delete()
    session.query(TDMSDefect).delete()
    session.query(TDMSTractionAsset).delete()
    session.query(SMMSFailure).delete()
    session.query(SMMSSignalAsset).delete()
    session.query(TMSDefect).delete()
    session.query(TMSTrackAsset).delete()
    session.commit()

    base_date = datetime.strptime(TARGET_DATE_STR, "%Y-%m-%d")

    # -------------------------------------------------------------------------
    # 1. TMS Track Assets (100 segments: SEG_001 to SEG_100)
    # -------------------------------------------------------------------------
    track_assets = []
    for i in range(1, 101):
        seg_id = f"SEG_{i:03d}"
        km_s = float(i - 1)
        km_e = float(i)
        
        # Traffic density between 15.0 and 65.0 Yearly GMT
        gmt = round(random.uniform(15.0, 65.0), 1)
        
        # Realistic TGI index (40 - 95). Segment 35 set to 48.2 (high wear/fracture risk)
        if i == 35:
            tgi = 48.2
            active_psr = 34.5
            psr_speed = 30
        else:
            tgi = round(random.uniform(52.0, 92.0), 1)
            active_psr = round(km_s + 0.5, 1) if random.random() < 0.15 else None
            psr_speed = random.choice([30, 45, 60, 75]) if active_psr else None

        usfd_due = (base_date + timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d")
        last_insp = (base_date - timedelta(days=random.randint(5, 45))).strftime("%Y-%m-%d")

        asset = TMSTrackAsset(
            segment_id=seg_id,
            track_section=f"Section {((i-1)//25)+1}: Km {km_s:.1f}-{km_e:.1f}",
            km_start=km_s,
            km_end=km_e,
            line_type="UP" if i % 2 == 1 else "DOWN",
            gauge_mm=1676,
            rail_weight_kg_m=60.0,
            sleeper_type="PSC",
            tgi_index=tgi,
            usfd_schedule_due=usfd_due,
            last_inspection_date=last_insp,
            active_psr_km=active_psr,
            psr_speed_kmph=psr_speed,
            yearly_gmt=gmt,
        )
        track_assets.append(asset)
    session.add_all(track_assets)
    session.flush()

    # -------------------------------------------------------------------------
    # 2. TMS Defects (61 rows)
    # -------------------------------------------------------------------------
    tms_defects = []
    # Seed defect on Segment 35 (severe rail fracture)
    tms_defects.append(
        TMSDefect(
            defect_id="TMS_DEF_035",
            segment_id="SEG_035",
            km_post=34.4,
            defect_type="Severe Rail Fracture",
            severity="Express",
            detected_date=(base_date - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S"),
            status="Open",
            suggested_action="Emergency rail replacement with 12m rail piece and weld clamp",
        )
    )

    # 60 additional defects spread across other segments
    candidate_segs = [f"SEG_{i:03d}" for i in range(1, 101) if i != 35]
    defect_types = [
        ("TGI Geometry Deviation", "Routine", "Tamping machine run recommended"),
        ("USFD Flaw Detected (IMW)", "Priority", "Jogglled fishplate installation"),
        ("Sleeper Distress / Crack", "Routine", "Sleeper renewal during maintenance window"),
        ("Thermit Weld Anomaly", "Priority", "Ultrasonic re-testing and clamp fitting"),
        ("Cupped Weld Joint", "Routine", "Rail joint resurfacing / grinding"),
        ("Corrugation / Surface Wear", "Routine", "Rail profile grinding"),
        ("Fastener Missing / Loose", "Routine", "Fastener tightening and ERC replacement"),
    ]

    selected_segs = random.sample(candidate_segs, 60)
    tms_indices = [i for i in range(1, 62) if i != 35]
    for seg, d_idx in zip(selected_segs, tms_indices):
        km_num = int(seg.split("_")[1])
        d_type, d_sev, d_act = random.choice(defect_types)
        # Randomize some severities for realistic distribution
        if d_idx % 7 == 0:
            d_sev = "Express"
        elif d_idx % 3 == 0:
            d_sev = "Priority"
        else:
            d_sev = "Routine"

        d_km = round((km_num - 1) + random.uniform(0.1, 0.9), 2)
        d_date = (base_date - timedelta(days=random.randint(1, 14), hours=random.randint(1, 12))).strftime("%Y-%m-%dT%H:%M:%S")

        tms_defects.append(
            TMSDefect(
                defect_id=f"TMS_DEF_{d_idx:03d}",
                segment_id=seg,
                km_post=d_km,
                defect_type=d_type,
                severity=d_sev,
                detected_date=d_date,
                status=random.choice(["Open", "Open", "In-Progress"]),
                suggested_action=d_act,
            )
        )
    session.add_all(tms_defects)
    session.flush()

    # -------------------------------------------------------------------------
    # 3. SMMS Signal Assets (200 rows)
    # -------------------------------------------------------------------------
    signal_assets = []
    sig_types = ["Point Machine", "Signal Post", "Track Circuit", "Axle Counter"]
    stations = ["KGP", "MDN", "HIJ", "BLS", "ROU", "CKP", "TATA", "JGM"]

    asset_counter = 1
    # 2 assets per segment = 200 assets
    for seg_idx in range(1, 101):
        seg_id = f"SEG_{seg_idx:03d}"
        for sub_idx in range(1, 3):
            aid = f"SIG_{asset_counter:03d}"
            # Ensure Segment 35 has a Point Machine
            if seg_idx == 35 and sub_idx == 1:
                atype = "Point Machine"
                st_code = "JGM"
                op_status = "Degraded"
                km_loc = 34.5
            else:
                atype = sig_types[(asset_counter - 1) % len(sig_types)]
                st_code = stations[(seg_idx // 13) % len(stations)]
                op_status = "Operational" if random.random() > 0.12 else "Degraded"
                km_loc = round((seg_idx - 1) + (0.35 * sub_idx), 2)

            inst_date = (base_date - timedelta(days=random.randint(300, 1800))).strftime("%Y-%m-%d")
            maint_date = (base_date - timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d")

            signal_assets.append(
                SMMSSignalAsset(
                    asset_id=aid,
                    segment_id=seg_id,
                    asset_type=atype,
                    station_code=st_code,
                    location_km=km_loc,
                    install_date=inst_date,
                    last_maintenance_date=maint_date,
                    operational_status=op_status,
                )
            )
            asset_counter += 1
    session.add_all(signal_assets)
    session.flush()

    # -------------------------------------------------------------------------
    # 4. SMMS Failures (46 rows)
    # -------------------------------------------------------------------------
    smms_failures = []
    # Seed failure on Segment 35 Point Machine
    smms_failures.append(
        SMMSFailure(
            failure_id="FAIL_SIG_035",
            asset_id="SIG_069",  # First asset of SEG_035: (35-1)*2 + 1 = 69
            segment_id="SEG_035",
            failure_type="Switch lock detection failure on Point Machine",
            severity="Priority",
            failure_time=(base_date - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S"),
            rectification_status="Logged",
            remarks="Switch lock detection failure during route setting; requires mechanical adjustment",
        )
    )

    # 45 additional failures distributed across other signal assets
    other_sig_assets = [a for a in signal_assets if a.asset_id != "SIG_069"]
    chosen_sig_assets = random.sample(other_sig_assets, 45)

    sig_failure_types = [
        ("Signal Lamp LED Aspect Failure", "Priority", "Main red aspect LED cluster flickering"),
        ("Track Circuit Relay Drop / Chattering", "Priority", "False occupancy indication during damp weather"),
        ("Digital Axle Counter Reset Failure", "Express", "Dual wheel detector count mismatch"),
        ("Point Machine Friction Clutch Slipping", "Priority", "Friction clutch slipping under load"),
        ("Fuse Blown in Relay Room Rack", "Routine", "Auxiliary indication fuse blown"),
        ("Point Detection Contact Corrosion", "Routine", "Periodic contact cleaning required"),
        ("Signal Post Alignment Deviation", "Routine", "Focus alignment check required"),
    ]

    sig_indices = [i for i in range(1, 47) if i != 35]
    for s_asset, f_idx in zip(chosen_sig_assets, sig_indices):
        f_type, f_sev, f_rem = random.choice(sig_failure_types)
        f_time = (base_date - timedelta(days=random.randint(0, 3), hours=random.randint(1, 20))).strftime("%Y-%m-%dT%H:%M:%S")
        smms_failures.append(
            SMMSFailure(
                failure_id=f"FAIL_SIG_{f_idx:03d}",
                asset_id=s_asset.asset_id,
                segment_id=s_asset.segment_id,
                failure_type=f_type,
                severity=f_sev,
                failure_time=f_time,
                rectification_status=random.choice(["Logged", "Attended"]),
                remarks=f_rem,
            )
        )
    session.add_all(smms_failures)
    session.flush()

    # -------------------------------------------------------------------------
    # 5. TDMS Traction Assets (200 rows)
    # -------------------------------------------------------------------------
    traction_assets = []
    ohe_types = ["OHE Mast", "OHE Mast", "Cantilever Assembly", "Section Insulator"]
    trd_counter = 1
    for seg_idx in range(1, 101):
        seg_id = f"SEG_{seg_idx:03d}"
        for sub_idx in range(1, 3):
            aid = f"OHE_{trd_counter:03d}"
            # Ensure Segment 35 has a misaligned OHE Mast
            if seg_idx == 35 and sub_idx == 1:
                atype = "OHE Mast"
                mast_no = "M-35/14"
                wear = 18.5
                stat = "Attention"
                km_loc = 34.6
            else:
                atype = ohe_types[(trd_counter - 1) % len(ohe_types)]
                mast_no = f"M-{seg_idx:02d}/{sub_idx*10}"
                wear = round(random.uniform(4.0, 19.0), 1)
                stat = "Attention" if wear > 16.0 or random.random() < 0.1 else "Normal"
                km_loc = round((seg_idx - 1) + (0.45 * sub_idx), 2)

            panto_insp = (base_date - timedelta(days=random.randint(10, 80))).strftime("%Y-%m-%d")

            traction_assets.append(
                TDMSTractionAsset(
                    asset_id=aid,
                    segment_id=seg_id,
                    asset_type=atype,
                    mast_number=mast_no,
                    location_km=km_loc,
                    contact_wire_wear_pct=wear,
                    last_panto_inspection=panto_insp,
                    status=stat,
                )
            )
            trd_counter += 1
    session.add_all(traction_assets)
    session.flush()

    # -------------------------------------------------------------------------
    # 6. TDMS Defects (46 rows)
    # -------------------------------------------------------------------------
    tdms_defects = []
    # Seed defect on Segment 35 OHE Mast (OHE_069)
    tdms_defects.append(
        TDMSDefect(
            defect_id="TRD_DEF_035",
            asset_id="OHE_069",  # (35-1)*2 + 1 = 69
            segment_id="SEG_035",
            defect_type="Misaligned OHE mast cantilever",
            severity="Priority",
            detected_date=(base_date - timedelta(hours=4)).strftime("%Y-%m-%dT%H:%M:%S"),
            status="Open",
        )
    )

    # 45 additional traction defects across other traction assets
    other_trd_assets = [a for a in traction_assets if a.asset_id != "OHE_069"]
    chosen_trd_assets = random.sample(other_trd_assets, 45)

    trd_defect_types = [
        ("Contact Wire Localized Wear > 18%", "Priority"),
        ("Cantilever Sag / Dropper Slackness", "Routine"),
        ("Insulator Flashover Markings", "Express"),
        ("OHE Height & Stagger Deviation", "Routine"),
        ("Jumper Wire Strands Broken", "Priority"),
        ("Section Insulator Runner Wear", "Priority"),
        ("Earth Discharge Bonding Loose", "Routine"),
    ]

    trd_indices = [i for i in range(1, 47) if i != 35]
    for t_asset, tr_idx in zip(chosen_trd_assets, trd_indices):
        d_type, d_sev = random.choice(trd_defect_types)
        d_date = (base_date - timedelta(days=random.randint(0, 5), hours=random.randint(1, 15))).strftime("%Y-%m-%dT%H:%M:%S")
        tdms_defects.append(
            TDMSDefect(
                defect_id=f"TRD_DEF_{tr_idx:03d}",
                asset_id=t_asset.asset_id,
                segment_id=t_asset.segment_id,
                defect_type=d_type,
                severity=d_sev,
                detected_date=d_date,
                status=random.choice(["Open", "Scheduled"]),
            )
        )
    session.add_all(tdms_defects)
    session.flush()

    # -------------------------------------------------------------------------
    # 7. COA Timetable (121 rows)
    # -------------------------------------------------------------------------
    coa_entries = []

    # Priority conflict 1: Express train (Howrah-Mumbai Mail) occupying Segment 35 (11:15 to 11:25)
    coa_entries.append(
        COATimetable(
            entry_id="COA_TT_001",
            train_number="12810",
            train_name="Howrah - CSMT Mumbai Mail",
            train_type="Express",
            route_km_start=34.0,
            route_km_end=35.0,
            scheduled_arrival=f"{TARGET_DATE_STR}T11:15:00",
            scheduled_departure=f"{TARGET_DATE_STR}T11:25:00",
            source_station="Howrah Junction (HWH)",
            dest_station="CSMT Mumbai (CSMT)",
            priority_rank=1,
        )
    )

    # Priority conflict 2: Coal Freight cargo train occupying Segment 35 (09:30 to 09:50)
    coa_entries.append(
        COATimetable(
            entry_id="COA_TT_002",
            train_number="FRT_COAL_35",
            train_name="Coal Freight BOXN-35",
            train_type="Freight",
            route_km_start=34.0,
            route_km_end=35.0,
            scheduled_arrival=f"{TARGET_DATE_STR}T09:30:00",
            scheduled_departure=f"{TARGET_DATE_STR}T09:50:00",
            source_station="Talcher Terminal",
            dest_station="Kolaghat Thermal Power",
            priority_rank=4,
        )
    )

    # 119 realistic train runs spread across the corridor and day
    train_templates = [
        ("22823", "Bhubaneswar - New Delhi Tejas Rajdhani", "Express", 1, "BBS", "NDLS"),
        ("20836", "Puri - Howrah Vande Bharat Express", "Express", 1, "PURI", "HWH"),
        ("12863", "Howrah - SMVT Bengaluru Superfast", "Express", 2, "HWH", "SMVB"),
        ("18045", "Howrah - Hyderabad East Coast Express", "Mail", 2, "HWH", "HYB"),
        ("18410", "Puri - Shalimar Sri Jagannath Express", "Mail", 2, "PURI", "SHM"),
        ("68001", "Kharagpur - Tatanagar Passenger Special", "Passenger", 3, "KGP", "TATA"),
        ("68012", "Midnapore - Howrah Local EMU", "Passenger", 3, "MDN", "HWH"),
        ("FRT_CONT_01", "CONCOR Container Liner", "Freight", 4, "CONCOR", "JNPT"),
        ("FRT_ORE_02", "Iron Ore BOBRN Heavy Haul", "Freight", 4, "KRDL", "VSKP"),
        ("FRT_CEMT_03", "Cement BCN Freight Rake", "Freight", 5, "ROU", "KGP"),
    ]

    for idx in range(3, 122):
        t_no, t_name, t_type, p_rank, src, dst = train_templates[(idx - 3) % len(train_templates)]
        # Distribute segments across 1 to 100, avoiding exact duplicate time-slot conflict on seg 35
        seg_k = ((idx * 7) % 99) + 1
        if seg_k == 35:
            seg_k = 36  # keep seg 35 dedicated to the designed conflict trains

        # Spread departure hours across 00:00 to 23:30
        h = (idx * 17) % 24
        m = (idx * 23) % 60
        arr_dt = datetime.strptime(f"{TARGET_DATE_STR} {h:02d}:{m:02d}:00", "%Y-%m-%d %H:%M:%S")
        dur_mins = random.choice([8, 12, 15, 20])
        dep_dt = arr_dt + timedelta(minutes=dur_mins)

        coa_entries.append(
            COATimetable(
                entry_id=f"COA_TT_{idx:03d}",
                train_number=f"{t_no}-{idx%10}",
                train_name=t_name,
                train_type=t_type,
                route_km_start=float(seg_k - 1),
                route_km_end=float(seg_k),
                scheduled_arrival=arr_dt.strftime("%Y-%m-%dT%H:%M:%S"),
                scheduled_departure=dep_dt.strftime("%Y-%m-%dT%H:%M:%S"),
                source_station=src,
                dest_station=dst,
                priority_rank=p_rank,
            )
        )
    session.add_all(coa_entries)
    session.flush()

    # -------------------------------------------------------------------------
    # 8. COA Freight Forecast (4 rows)
    # -------------------------------------------------------------------------
    freight_forecasts = [
        COAFreightForecast(
            forecast_id="FRT_FC_001",
            rake_id="BOXN_9921",
            freight_commodity="Coal",
            source_terminal="Talcher Siding",
            destination_terminal="Kolaghat Thermal Power Plant",
            expected_corridor_entry=f"{TARGET_DATE_STR}T08:30:00",
            expected_corridor_exit=f"{TARGET_DATE_STR}T12:00:00",
            speed_potential_kmph=75,
            gross_tonnage=4200.0,
        ),
        COAFreightForecast(
            forecast_id="FRT_FC_002",
            rake_id="BOBRN_4412",
            freight_commodity="Iron Ore",
            source_terminal="Kirandul Mines",
            destination_terminal="Visakhapatnam Port",
            expected_corridor_entry=f"{TARGET_DATE_STR}T13:00:00",
            expected_corridor_exit=f"{TARGET_DATE_STR}T16:30:00",
            speed_potential_kmph=70,
            gross_tonnage=4850.0,
        ),
        COAFreightForecast(
            forecast_id="FRT_FC_003",
            rake_id="BTPN_1820",
            freight_commodity="Fertilizer",
            source_terminal="Paradeep Port",
            destination_terminal="Rourkela Goods Yard",
            expected_corridor_entry=f"{TARGET_DATE_STR}T17:00:00",
            expected_corridor_exit=f"{TARGET_DATE_STR}T20:30:00",
            speed_potential_kmph=75,
            gross_tonnage=3600.0,
        ),
        COAFreightForecast(
            forecast_id="FRT_FC_004",
            rake_id="BCN_7741",
            freight_commodity="Container",
            source_terminal="CONCOR Inland Depot",
            destination_terminal="JNPT Terminal",
            expected_corridor_entry=f"{TARGET_DATE_STR}T21:00:00",
            expected_corridor_exit=f"2026-09-09T01:00:00",
            speed_potential_kmph=80,
            gross_tonnage=3250.0,
        ),
    ]
    session.add_all(freight_forecasts)
    session.flush()

    # -------------------------------------------------------------------------
    # 9. BDMS Blocks (7 rows)
    # Seeds the Bottleneck Collision on Segment 35 (Km 34.0–35.0) for 2026-09-08
    # -------------------------------------------------------------------------
    bdms_blocks = [
        # Bottleneck Collision Request 1 (Engineering): Emergency block (10:00 to 12:00)
        BDMSBlock(
            block_id="BLK_ENG_CONFL",
            department="Engineering",
            block_type="Emergency",
            status="Submission",
            segment_id="SEG_035",
            km_start=34.0,
            km_end=35.0,
            requested_start=f"{TARGET_DATE_STR}T10:00:00",
            requested_end=f"{TARGET_DATE_STR}T12:00:00",
            approved_start=None,
            approved_end=None,
            work_description="Emergency traffic block to repair a severe rail fracture detected at Km 34.4",
            resource_details="1x Rail Cutting Machine, 1x Flash Butt Welding Squad, 12 Gangmen",
            created_at=f"{TARGET_DATE_STR}T06:00:00",
        ),
        # Bottleneck Collision Request 2 (Signal): Integrated block (10:30 to 11:30)
        BDMSBlock(
            block_id="BLK_SNT_CONFL",
            department="Signal",
            block_type="Integrated",
            status="Submission",
            segment_id="SEG_035",
            km_start=34.0,
            km_end=35.0,
            requested_start=f"{TARGET_DATE_STR}T10:30:00",
            requested_end=f"{TARGET_DATE_STR}T11:30:00",
            approved_start=None,
            approved_end=None,
            work_description="Integrated block to repair a switch lock failure on Point Machine PM-35",
            resource_details="Signal Inspector Squad, Switch Adjustment Toolkit, Multi-meter Unit",
            created_at=f"{TARGET_DATE_STR}T07:15:00",
        ),
        # Bottleneck Collision Request 3 (Traction): Shadow block (09:30 to 11:00)
        BDMSBlock(
            block_id="BLK_TRD_CONFL",
            department="Traction",
            block_type="Shadow",
            status="Submission",
            segment_id="SEG_035",
            km_start=34.0,
            km_end=35.0,
            requested_start=f"{TARGET_DATE_STR}T09:30:00",
            requested_end=f"{TARGET_DATE_STR}T11:00:00",
            approved_start=None,
            approved_end=None,
            work_description="Shadow block to adjust a misaligned OHE mast cantilever at Km 34.6",
            resource_details="1x Tower Wagon, 1x OHE Line Maintenance Gang, Earth Discharge Rods",
            created_at=f"{TARGET_DATE_STR}T07:45:00",
        ),
        # 4 Realistic Non-Conflicting Block Requests Across Corridor
        BDMSBlock(
            block_id="BLK_ENG_012",
            department="Engineering",
            block_type="Shadow",
            status="Submission",
            segment_id="SEG_012",
            km_start=11.0,
            km_end=12.0,
            requested_start=f"{TARGET_DATE_STR}T14:00:00",
            requested_end=f"{TARGET_DATE_STR}T16:00:00",
            approved_start=None,
            approved_end=None,
            work_description="Routine deep screening and ballast tamping using BCM unit",
            resource_details="1x Ballast Cleaning Machine (BCM), 10 Trackmen",
            created_at=f"{TARGET_DATE_STR}T05:30:00",
        ),
        BDMSBlock(
            block_id="BLK_SNT_055",
            department="Signal",
            block_type="Integrated",
            status="Submission",
            segment_id="SEG_055",
            km_start=54.0,
            km_end=55.0,
            requested_start=f"{TARGET_DATE_STR}T13:00:00",
            requested_end=f"{TARGET_DATE_STR}T14:30:00",
            approved_start=None,
            approved_end=None,
            work_description="Track circuit bonding and insulation renewal",
            resource_details="Signal Technician Team, Bonding Drill, Insulation Kit",
            created_at=f"{TARGET_DATE_STR}T06:45:00",
        ),
        BDMSBlock(
            block_id="BLK_TRD_078",
            department="Traction",
            block_type="Shadow",
            status="Submission",
            segment_id="SEG_078",
            km_start=77.0,
            km_end=78.0,
            requested_start=f"{TARGET_DATE_STR}T15:30:00",
            requested_end=f"{TARGET_DATE_STR}T17:00:00",
            approved_start=None,
            approved_end=None,
            work_description="Contact wire height check and dropper replacement",
            resource_details="1x Tower Wagon, Ladder Gang",
            created_at=f"{TARGET_DATE_STR}T07:00:00",
        ),
        BDMSBlock(
            block_id="BLK_ENG_092",
            department="Engineering",
            block_type="Integrated",
            status="Submission",
            segment_id="SEG_092",
            km_start=91.0,
            km_end=92.0,
            requested_start=f"{TARGET_DATE_STR}T06:00:00",
            requested_end=f"{TARGET_DATE_STR}T08:00:00",
            approved_start=None,
            approved_end=None,
            work_description="Turnout sleeper replacement and packing",
            resource_details="1x UNIMAT Tamper, 14 Track Maintainers",
            created_at=f"2026-09-07T18:00:00",
        ),
    ]
    session.add_all(bdms_blocks)
    session.flush()

    # -------------------------------------------------------------------------
    # 10. Decision Audit (4 rows)
    # Human-in-the-Loop tracking logs
    # -------------------------------------------------------------------------
    decision_audits = [
        DecisionAudit(
            audit_id="AUDIT_001",
            block_id="BLK_ENG_092",
            action="Submit",
            actor="PW Senior Section Engineer",
            timestamp="2026-09-07T18:05:00",
            reason="Submitted initial block requisition for turnout overhaul",
            previous_state="Draft",
            new_state="Submission",
        ),
        DecisionAudit(
            audit_id="AUDIT_002",
            block_id="BLK_ENG_CONFL",
            action="Submit",
            actor="Permanent Way Inspector PWI_KGP",
            timestamp=f"{TARGET_DATE_STR}T06:05:00",
            reason="Urgent rail fracture detected during early morning USFD patrol",
            previous_state="Draft",
            new_state="Submission",
        ),
        DecisionAudit(
            audit_id="AUDIT_003",
            block_id="BLK_SNT_CONFL",
            action="Submit",
            actor="Section Signal Inspector SSI_03",
            timestamp=f"{TARGET_DATE_STR}T07:20:00",
            reason="Point machine PM-35 failing lock test; switch detection broken",
            previous_state="Draft",
            new_state="Submission",
        ),
        DecisionAudit(
            audit_id="AUDIT_004",
            block_id="BLK_TRD_CONFL",
            action="Submit",
            actor="OHE Depot Incharge TRD_EAST",
            timestamp=f"{TARGET_DATE_STR}T07:50:00",
            reason="Mast misalignment observed on OHE-35; cantilever angle adjusted",
            previous_state="Draft",
            new_state="Submission",
        ),
    ]
    session.add_all(decision_audits)
    session.commit()
    session.close()


def verify_database(engine: Optional[Engine] = None):
    """Print and verify all table row counts."""
    counts = get_table_counts(engine)
    print("=== SQLite Database Table Counts ===")
    for table, count in sorted(counts.items()):
        print(f"{table:25}: {count} rows")
    return counts


if __name__ == "__main__":
    print(f"Generating high-fidelity mock data (Seed: {RANDOM_SEED})...")
    populate_corridor_data()
    print("Data population complete. Verifying table row counts:")
    verify_database()

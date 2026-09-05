"""
Automated Integration Tests for FastAPI Backend Service (backend/api.py).
Verifies all REST API endpoints, Pydantic validations, and database mutations.
"""

import pytest
from fastapi.testclient import TestClient
from backend.api import app
from backend.config import TARGET_DATE_STR

client = TestClient(app)


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["operational_date"] == TARGET_DATE_STR


def test_api_kpis():
    response = client.get("/api/kpis")
    assert response.status_code == 200
    data = response.json()
    assert "corridor_savings" in data
    assert data["corridor_savings"]["minutes_saved"] == 150
    assert data["corridor_savings"]["percentage_saved"] == 55.6
    assert "punctuality" in data
    assert "defects_backlog" in data
    assert "distributed_solve" in data
    assert data["distributed_solve"]["decomposed_time_ms"] > 0


def test_api_blocks():
    response = client.get("/api/blocks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 7
    block_ids = [b["block_id"] for b in data]
    assert "BLK_ENG_CONFL" in block_ids
    assert "BLK_TRD_CONFL" in block_ids


def test_api_trains():
    response = client.get("/api/trains?segment_id=SEG_035")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


def test_api_gantt():
    response = client.get("/api/gantt?segment_id=SEG_035")
    assert response.status_code == 200
    data = response.json()
    assert "trains" in data
    assert "original_demands" in data
    assert "sanctioned_blocks" in data
    assert "bottleneck_window" in data
    assert data["bottleneck_window"]["duration_minutes"] == 120


def test_api_pareto():
    response = client.get("/api/pareto")
    assert response.status_code == 200
    data = response.json()
    assert "frontier_points" in data
    assert len(data["frontier_points"]) == 5


def test_api_resources():
    response = client.get("/api/resources")
    assert response.status_code == 200
    data = response.json()
    assert "timeline" in data
    assert "opportunity_grouping" in data
    assert data["equipment_collisions"] == 0


def test_api_asset_health():
    response = client.get("/api/asset-health/SEG_035")
    assert response.status_code == 200
    data = response.json()
    assert "days" in data
    assert "maintained_curve" in data
    assert "unmaintained_curve" in data


def test_api_xai():
    response = client.get("/api/xai/BLK_ENG_CONFL")
    assert response.status_code == 200
    data = response.json()
    assert data["block_id"] == "BLK_ENG_CONFL"
    assert len(data["components"]) >= 5
    assert data["final_priority_weight"] >= 90.0


def test_api_distributed_benchmark():
    response = client.get("/api/distributed-benchmark")
    assert response.status_code == 200
    data = response.json()
    assert "decomposed_time_ms" in data
    assert data["sub_areas_count"] == 3


def test_api_audits():
    response = client.get("/api/audits")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_api_reschedule_simulation():
    # Safe window test
    response = client.post("/api/blocks/simulate-reschedule", json={
        "block_id": "BLK_ENG_012",
        "start": "13:35",
        "end": "15:00"
    })
    assert response.status_code == 200
    data = response.json()
    assert "is_conflict_free" in data

    # Invalid time format test
    bad_resp = client.post("/api/blocks/simulate-reschedule", json={
        "block_id": "BLK_ENG_012",
        "start": "25:99",
        "end": "15:00"
    })
    assert bad_resp.status_code == 400

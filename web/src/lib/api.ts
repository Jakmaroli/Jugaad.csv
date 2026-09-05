/**
 * API client library for Indian Railways Block Planning Decision Cockpit.
 * Connects Next.js client to FastAPI backend at http://localhost:8000.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchKPIs() {
  const res = await fetch(`${API_BASE}/api/kpis`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch KPIs");
  return res.json();
}

export async function fetchBlocks() {
  const res = await fetch(`${API_BASE}/api/blocks`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch blocks");
  return res.json();
}

export async function fetchGantt(segmentId: string = "SEG_035") {
  const res = await fetch(`${API_BASE}/api/gantt?segment_id=${segmentId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch Gantt data");
  return res.json();
}

export async function fetchPareto() {
  const res = await fetch(`${API_BASE}/api/pareto`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch Pareto data");
  return res.json();
}

export async function fetchResources() {
  const res = await fetch(`${API_BASE}/api/resources`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch resource leveling data");
  return res.json();
}

export async function fetchAssetHealth(segmentId: string = "SEG_035") {
  const res = await fetch(`${API_BASE}/api/asset-health/${segmentId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch asset health trajectory");
  return res.json();
}

export async function fetchLocalXAI(blockId: string) {
  const res = await fetch(`${API_BASE}/api/xai/${blockId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch XAI for ${blockId}`);
  return res.json();
}

export async function fetchDistributedBenchmark() {
  const res = await fetch(`${API_BASE}/api/distributed-benchmark`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch distributed benchmark");
  return res.json();
}

export async function fetchAudits() {
  const res = await fetch(`${API_BASE}/api/audits`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch decision audit log");
  return res.json();
}

export async function approveBlock(blockId: string, actor: string = "Section Controller SC_01") {
  const res = await fetch(`${API_BASE}/api/blocks/${blockId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Approval failed");
  }
  return res.json();
}

export async function rejectBlock(blockId: string, reason: string, actor: string = "Section Controller SC_01") {
  const res = await fetch(`${API_BASE}/api/blocks/${blockId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor, reason }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Rejection failed");
  }
  return res.json();
}

export async function simulateReschedule(blockId: string, start: string, end: string) {
  const res = await fetch(`${API_BASE}/api/blocks/simulate-reschedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ block_id: blockId, start, end }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Simulation failed");
  }
  return res.json();
}

export async function confirmReschedule(blockId: string, start: string, end: string, actor: string = "Section Controller SC_01") {
  const res = await fetch(`${API_BASE}/api/blocks/confirm-reschedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ block_id: blockId, start, end, actor }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Reschedule confirmation failed");
  }
  return res.json();
}

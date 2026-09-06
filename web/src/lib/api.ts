/**
 * API client library for Indian Railways Block Planning Decision Cockpit.
 * Connects Next.js client to FastAPI backend at http://localhost:8000.
 * Automatically falls back to high-fidelity simulated corridor data if FastAPI
 * is offline or in Demo Mode, ensuring zero-error demo reliability.
 */

import {
  MOCK_KPIS,
  MOCK_BLOCKS,
  MOCK_GANTT_DATA,
  MOCK_XAI,
  MOCK_PARETO,
  MOCK_RESOURCES,
  MOCK_ASSET_HEALTH,
  MOCK_AUDITS,
} from "./mockData";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// In-memory local state for simulated offline mutations
let localBlocks = JSON.parse(JSON.stringify(MOCK_BLOCKS));
let localAudits = JSON.parse(JSON.stringify(MOCK_AUDITS));
let pnSequence = 43;

export async function fetchKPIs() {
  try {
    const res = await fetch(`${API_BASE}/api/kpis`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("API returned non-200");
    return await res.json();
  } catch (err) {
    console.warn("Using simulated KPIs (Backend offline or unreachable)");
    return MOCK_KPIS;
  }
}

export async function fetchBlocks() {
  try {
    const res = await fetch(`${API_BASE}/api/blocks`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("API returned non-200");
    return await res.json();
  } catch (err) {
    console.warn("Using simulated Blocks (Backend offline or unreachable)");
    return localBlocks;
  }
}

export async function fetchGantt(segmentId: string = "SEG_035") {
  try {
    const res = await fetch(`${API_BASE}/api/gantt?segment_id=${segmentId}`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("API returned non-200");
    return await res.json();
  } catch (err) {
    console.warn(`Using simulated Gantt for ${segmentId}`);
    return MOCK_GANTT_DATA[segmentId] || MOCK_GANTT_DATA["SEG_035"];
  }
}

export async function fetchPareto() {
  try {
    const res = await fetch(`${API_BASE}/api/pareto`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("API returned non-200");
    return await res.json();
  } catch (err) {
    return MOCK_PARETO;
  }
}

export async function fetchResources() {
  try {
    const res = await fetch(`${API_BASE}/api/resources`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("API returned non-200");
    return await res.json();
  } catch (err) {
    return MOCK_RESOURCES;
  }
}

export async function fetchAssetHealth(segmentId: string = "SEG_035") {
  try {
    const res = await fetch(`${API_BASE}/api/asset-health/${segmentId}`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("API returned non-200");
    return await res.json();
  } catch (err) {
    return MOCK_ASSET_HEALTH;
  }
}

export async function fetchLocalXAI(blockId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/xai/${blockId}`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("API returned non-200");
    return await res.json();
  } catch (err) {
    return MOCK_XAI[blockId] || MOCK_XAI["BLK_001"];
  }
}

export async function fetchDistributedBenchmark() {
  try {
    const res = await fetch(`${API_BASE}/api/distributed-benchmark`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("API returned non-200");
    return await res.json();
  } catch (err) {
    return {
      centralized_total_seconds: 0.1125,
      decomposed_total_seconds: 0.0184,
      speedup_factor: 6.1,
      sub_areas_count: 3,
    };
  }
}

export async function fetchAudits() {
  try {
    const res = await fetch(`${API_BASE}/api/audits`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("API returned non-200");
    return await res.json();
  } catch (err) {
    return localAudits;
  }
}

export async function approveBlock(blockId: string, actor: string = "Section Controller SC_01") {
  try {
    const res = await fetch(`${API_BASE}/api/blocks/${blockId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor }),
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend approval failed or offline, simulating local approval...");
  }

  // Simulated fallback action
  const found = localBlocks.find((b: any) => b.block_id === blockId);
  if (found) {
    found.status = "Approved";
  }
  const pn = `PN-035-20260908-00${pnSequence++}`;
  localAudits.unshift({
    id: localAudits.length + 1,
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    block_id: blockId,
    action: "SANCTION_APPROVED",
    actor: actor,
    private_number: pn,
    comments: `Statutory sanction granted for ${blockId}. Conflict-free slot confirmed.`,
  });

  return {
    success: true,
    block_id: blockId,
    status: "Approved",
    private_number: pn,
    actor,
    timestamp: new Date().toISOString(),
  };
}

export async function rejectBlock(blockId: string, reason: string, actor: string = "Section Controller SC_01") {
  try {
    const res = await fetch(`${API_BASE}/api/blocks/${blockId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor, reason }),
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend reject failed or offline, simulating local reject...");
  }

  const found = localBlocks.find((b: any) => b.block_id === blockId);
  if (found) {
    found.status = "Rejected";
  }
  localAudits.unshift({
    id: localAudits.length + 1,
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    block_id: blockId,
    action: "SANCTION_REJECTED",
    actor: actor,
    private_number: null,
    comments: `Rejected: ${reason}`,
  });

  return {
    success: true,
    block_id: blockId,
    status: "Rejected",
    reason,
  };
}

export async function simulateReschedule(blockId: string, start: string, end: string) {
  try {
    const res = await fetch(`${API_BASE}/api/blocks/simulate-reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block_id: blockId, start, end }),
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend simulate failed or offline, calculating local simulation...");
  }

  // Parse hours and minutes to check collision against 10:15 Mail and 10:55 Freight
  const startHHMM = start.includes("T") ? start.slice(11, 16) : start;
  const endHHMM = end.includes("T") ? end.slice(11, 16) : end;

  // Safe window is 11:35 - 13:35
  const isSafeWindow = startHHMM >= "11:30" && endHHMM <= "13:40";

  if (isSafeWindow) {
    return {
      conflict_count: 0,
      train_conflicts: [],
      total_primary_delay_minutes: 0,
      total_cascade_delay_minutes: 0,
      is_feasible: true,
    };
  }

  // Conflicting window
  return {
    conflict_count: 2,
    train_conflicts: [
      {
        train_number: "12839",
        train_name: "Howrah - Chennai Mail",
        arrival: "2026-09-08T10:15:00",
        departure: "2026-09-08T10:28:00",
      },
      {
        train_number: "BOXN-42",
        train_name: "Coal Bulk Freight",
        arrival: "2026-09-08T10:55:00",
        departure: "2026-09-08T11:25:00",
      },
    ],
    total_primary_delay_minutes: 55,
    total_cascade_delay_minutes: 95,
    is_feasible: false,
  };
}

export async function confirmReschedule(
  blockId: string,
  start: string,
  end: string,
  actor: string = "Section Controller SC_01"
) {
  try {
    const res = await fetch(`${API_BASE}/api/blocks/confirm-reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block_id: blockId, start, end, actor }),
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend confirm failed or offline, simulating local confirm...");
  }

  const pn = `PN-035-20260908-00${pnSequence++}`;
  const found = localBlocks.find((b: any) => b.block_id === blockId);
  if (found) {
    found.approved_start = start;
    found.approved_end = end;
    found.status = "Approved";
  }

  localAudits.unshift({
    id: localAudits.length + 1,
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    block_id: blockId,
    action: "MANUAL_RESCHEDULE_COMMITTED",
    actor: actor,
    private_number: pn,
    comments: `Controller manual shift to ${start.slice(11, 16)}-${end.slice(11, 16)}. PN issued.`,
  });

  return {
    success: true,
    block_id: blockId,
    private_number: pn,
    status: "Approved",
  };
}

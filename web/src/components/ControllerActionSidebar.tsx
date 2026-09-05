"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ShieldAlert,
  HelpCircle,
  FileCheck,
  TrendingUp,
  AlertOctagon,
  RefreshCw,
  Send,
  Sliders,
  ChevronRight,
} from "lucide-react";
import {
  approveBlock,
  rejectBlock,
  simulateReschedule,
  confirmReschedule,
  fetchLocalXAI,
} from "../lib/api";

export interface BlockDetail {
  block_id: string;
  department: string;
  block_type: string;
  status: string;
  segment_id: string;
  km_start: number;
  km_end: number;
  requested_start: string;
  requested_end: string;
  approved_start: string | null;
  approved_end: string | null;
  priority_weight: number;
  work_description: string;
  resource_details: string;
}

interface ControllerSidebarProps {
  selectedBlock: BlockDetail | null;
  allBlocks: BlockDetail[];
  onSelectBlock: (blockId: string) => void;
  onActionSuccess: () => void;
}

interface XAIComponent {
  feature: string;
  value: number;
  description: string;
}

interface XAIData {
  block_id: string;
  department: string;
  block_type: string;
  segment_id: string;
  final_priority_weight: number;
  rule_criticality_score: number;
  yearly_gmt: number;
  tgi_index: number;
  has_psr: boolean;
  psr_speed_kmph: number | null;
  components: XAIComponent[];
  waterfall_labels: string[];
  waterfall_values: number[];
}

interface RescheduleSimResult {
  conflict_count: number;
  train_conflicts: Array<{
    train_number: string;
    train_name: string;
    arrival: string;
    departure: string;
  }>;
  total_primary_delay_minutes: number;
  total_cascade_delay_minutes: number;
  is_feasible: boolean;
}

export const ControllerActionSidebar: React.FC<ControllerSidebarProps> = ({
  selectedBlock,
  allBlocks,
  onSelectBlock,
  onActionSuccess,
}) => {
  const [actor, setActor] = useState("Section Controller SC_01");
  const [rejectReason, setRejectReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Manual Reschedule state
  const [reschedStart, setReschedStart] = useState("11:35");
  const [reschedEnd, setReschedEnd] = useState("13:35");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [simResult, setSimResult] = useState<RescheduleSimResult | null>(null);

  // Local XAI state
  const [xaiData, setXaiData] = useState<XAIData | null>(null);
  const [loadingXAI, setLoadingXAI] = useState(false);

  // Success Feedback
  const [lastActionMessage, setLastActionMessage] = useState<{
    type: "success" | "error";
    title: string;
    pn?: string;
    detail: string;
  } | null>(null);

  // Load XAI whenever selected block changes
  useEffect(() => {
    if (!selectedBlock) {
      setXaiData(null);
      setSimResult(null);
      return;
    }

    // Set initial reschedule times from approved or requested window
    const baseStart = selectedBlock.approved_start || selectedBlock.requested_start || "";
    const baseEnd = selectedBlock.approved_end || selectedBlock.requested_end || "";
    if (baseStart.includes("T")) {
      setReschedStart(baseStart.split("T")[1].slice(0, 5));
    }
    if (baseEnd.includes("T")) {
      setReschedEnd(baseEnd.split("T")[1].slice(0, 5));
    }
    setSimResult(null);

    let isMounted = true;
    setLoadingXAI(true);
    fetchLocalXAI(selectedBlock.block_id)
      .then((data) => {
        if (isMounted) {
          setXaiData(data);
          setLoadingXAI(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("XAI load error:", err);
          setLoadingXAI(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedBlock?.block_id]);

  // Handle Approve Block & Mint PN
  const handleApprove = async () => {
    if (!selectedBlock) return;
    setIsApproving(true);
    setLastActionMessage(null);
    try {
      const res = await approveBlock(selectedBlock.block_id, actor);
      setLastActionMessage({
        type: "success",
        title: "Block Sanctioned Under Statutory Authority",
        pn: res.private_number,
        detail: `Possession granted. Private Number ${res.private_number} minted and committed to permanent audit register.`,
      });
      onActionSuccess();
    } catch (err: any) {
      setLastActionMessage({
        type: "error",
        title: "Sanction Failed",
        detail: err.message || "Approval request failed.",
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject Block
  const handleReject = async () => {
    if (!selectedBlock) return;
    if (!rejectReason.trim()) {
      alert("Please provide a statutory justification for rejecting this block.");
      return;
    }
    setIsRejecting(true);
    setLastActionMessage(null);
    try {
      await rejectBlock(selectedBlock.block_id, rejectReason, actor);
      setLastActionMessage({
        type: "success",
        title: "Block Request Rejected",
        detail: `Block ${selectedBlock.block_id} rejected. Reason recorded in Decision Audit Log.`,
      });
      setRejectReason("");
      onActionSuccess();
    } catch (err: any) {
      setLastActionMessage({
        type: "error",
        title: "Rejection Failed",
        detail: err.message || "Reject request failed.",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle Simulate Reschedule
  const handleSimulate = async () => {
    if (!selectedBlock) return;
    setIsSimulating(true);
    setSimResult(null);
    try {
      const baseDate = (selectedBlock.requested_start || "2026-09-08").split("T")[0];
      const startIso = `${baseDate}T${reschedStart}:00`;
      const endIso = `${baseDate}T${reschedEnd}:00`;
      const res = await simulateReschedule(selectedBlock.block_id, startIso, endIso);
      setSimResult(res);
    } catch (err: any) {
      alert(err.message || "Simulation failed");
    } finally {
      setIsSimulating(false);
    }
  };

  // Handle Confirm Reschedule & Mint PN
  const handleConfirmReschedule = async () => {
    if (!selectedBlock) return;
    setIsConfirming(true);
    setLastActionMessage(null);
    try {
      const baseDate = (selectedBlock.requested_start || "2026-09-08").split("T")[0];
      const startIso = `${baseDate}T${reschedStart}:00`;
      const endIso = `${baseDate}T${reschedEnd}:00`;
      const res = await confirmReschedule(selectedBlock.block_id, startIso, endIso, actor);
      setLastActionMessage({
        type: "success",
        title: "Manual Reschedule Committed",
        pn: res.private_number,
        detail: `Block ${selectedBlock.block_id} approved for ${reschedStart}-${reschedEnd}. Private Number ${res.private_number} issued.`,
      });
      setSimResult(null);
      onActionSuccess();
    } catch (err: any) {
      setLastActionMessage({
        type: "error",
        title: "Reschedule Failed",
        detail: err.message || "Failed to confirm reschedule.",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col space-y-5 backdrop-blur-md">
      {/* Header with Block Quick-Switcher */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white text-base">Controller Action Cockpit</h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Control Office App (COA)
          </span>
        </div>

        {/* Quick select dropdown */}
        <div className="mt-3">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Active Selection
          </label>
          <select
            value={selectedBlock?.block_id || ""}
            onChange={(e) => onSelectBlock(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500 transition-colors"
          >
            {allBlocks.map((b) => (
              <option key={b.block_id} value={b.block_id}>
                {b.block_id} • {b.department} ({b.status}) - Pri {b.priority_weight}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Block Dossier */}
      {selectedBlock && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Department / Type:</span>
            <span className="text-white font-semibold">
              {selectedBlock.department} ({selectedBlock.block_type})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Location:</span>
            <span className="text-sky-300">
              {selectedBlock.segment_id} (KM {selectedBlock.km_start} - {selectedBlock.km_end})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Current Status:</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedBlock.status === "Approved" || selectedBlock.status === "Granted"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  : selectedBlock.status === "Rejected"
                  ? "bg-red-950 text-red-300 border border-red-700"
                  : "bg-amber-950 text-amber-300 border border-amber-700"
              }`}
            >
              {selectedBlock.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">CP-SAT Slot:</span>
            <span className="text-emerald-400 font-semibold">
              {selectedBlock.approved_start ? selectedBlock.approved_start.slice(11, 16) : "--:--"} →{" "}
              {selectedBlock.approved_end ? selectedBlock.approved_end.slice(11, 16) : "--:--"}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-slate-300 text-[11px] leading-relaxed">
            <span className="text-slate-500 block mb-0.5">Work Order Description:</span>
            {selectedBlock.work_description}
          </div>
        </div>
      )}

      {/* Action Notification Banner */}
      {lastActionMessage && (
        <div
          className={`p-3 rounded-lg border text-xs animate-fadeIn ${
            lastActionMessage.type === "success"
              ? "bg-emerald-950/70 border-emerald-600 text-emerald-200"
              : "bg-red-950/70 border-red-600 text-red-200"
          }`}
        >
          <div className="flex items-start space-x-2">
            {lastActionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-white">{lastActionMessage.title}</div>
              {lastActionMessage.pn && (
                <div className="mt-1 font-mono text-amber-300 bg-black/40 px-2 py-0.5 rounded inline-block border border-amber-500/40">
                  STATUTORY PRIV. NO: <span className="font-bold text-white">{lastActionMessage.pn}</span>
                </div>
              )}
              <p className="mt-1 text-[11px] opacity-90">{lastActionMessage.detail}</p>
            </div>
          </div>
        </div>
      )}

      {/* Controller Actor Sign-off Field */}
      <div>
        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
          Authorizing Officer (Duty SC)
        </label>
        <input
          type="text"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
          placeholder="Section Controller Identity"
        />
      </div>

      {/* Action Tabs / Buttons: Sanction vs Reject */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleApprove}
          disabled={isApproving || !selectedBlock}
          className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApproving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <FileCheck className="w-4 h-4" />
          )}
          <span>Grant Statutory PN</span>
        </button>

        <button
          onClick={handleReject}
          disabled={isRejecting || !selectedBlock}
          className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg bg-rose-900/50 hover:bg-rose-800 active:scale-98 border border-rose-700/60 text-rose-200 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRejecting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span>Reject Request</span>
        </button>
      </div>

      {/* Rejection Justification Field */}
      <div>
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Required reason if rejecting request..."
          className="w-full bg-slate-950/70 border border-slate-800 rounded px-2.5 py-1 text-[11px] text-slate-300 font-mono focus:border-red-500 focus:outline-none placeholder:text-slate-600"
        />
      </div>

      {/* ================= SECTION: MANUAL RESCHEDULE TOOL ================= */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Manual Reschedule & Simulation</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">P0 Audit-Safe</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-0.5">Start (HH:MM)</label>
            <input
              type="time"
              value={reschedStart}
              onChange={(e) => {
                setReschedStart(e.target.value);
                setSimResult(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-0.5">End (HH:MM)</label>
            <input
              type="time"
              value={reschedEnd}
              onChange={(e) => {
                setReschedEnd(e.target.value);
                setSimResult(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
            />
          </div>
        </div>

        {/* Simulation button */}
        <button
          onClick={handleSimulate}
          disabled={isSimulating || !selectedBlock}
          className="w-full py-1.5 rounded bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-300 text-xs font-mono font-medium flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
        >
          {isSimulating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <TrendingUp className="w-3.5 h-3.5" />
          )}
          <span>Simulate Corridor Conflict Impact</span>
        </button>

        {/* Simulation Output Card */}
        {simResult && (
          <div
            className={`p-2.5 rounded border text-xs font-mono space-y-1.5 animate-fadeIn ${
              simResult.conflict_count === 0
                ? "bg-emerald-950/40 border-emerald-600/60 text-emerald-300"
                : "bg-red-950/40 border-red-600/60 text-red-300"
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span>Simulation Verdict:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  simResult.conflict_count === 0 ? "bg-emerald-900 text-emerald-200" : "bg-red-900 text-red-200"
                }`}
              >
                {simResult.conflict_count === 0 ? "0 CONFLICTS SAFE" : `${simResult.conflict_count} TRAIN CONFLICTS`}
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              Primary Delay: <span className="font-bold text-white">{simResult.total_primary_delay_minutes}m</span> •
              Cascade Delay: <span className="font-bold text-white">{simResult.total_cascade_delay_minutes}m</span>
            </div>

            {simResult.conflict_count > 0 && simResult.train_conflicts.length > 0 && (
              <div className="pt-1 text-[10px] text-red-400 space-y-0.5">
                {simResult.train_conflicts.map((tc, idx) => (
                  <div key={idx}>
                    Collides with: {tc.train_number} {tc.train_name} ({tc.arrival.slice(11, 16)}-{tc.departure.slice(11, 16)})
                  </div>
                ))}
              </div>
            )}

            {/* Confirm reschedule button (only enabled if safe) */}
            <button
              onClick={handleConfirmReschedule}
              disabled={simResult.conflict_count > 0 || isConfirming}
              className={`w-full mt-2 py-1.5 rounded text-xs font-semibold font-mono flex items-center justify-center space-x-1.5 transition-all ${
                simResult.conflict_count === 0
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-950"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
              }`}
            >
              {isConfirming ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Commit Reschedule & Mint PN</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= SECTION: LOCAL EXPLAINABLE AI (XAI) ================= */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Local Explainable AI (XAI) Attribution</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400/90 font-medium">
            Score: {selectedBlock?.priority_weight || 0} / 100
          </span>
        </div>

        {loadingXAI ? (
          <div className="py-4 flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
            <RefreshCw className="w-4 h-4 animate-spin mb-1 text-amber-400" />
            <span>Decomposing feature attribution weights...</span>
          </div>
        ) : xaiData ? (
          <div className="space-y-2 text-xs font-mono">
            <p className="text-[11px] text-slate-400">
              Feature contribution breakdown explaining priority score computation:
            </p>

            <div className="space-y-1.5">
              {xaiData.components.map((comp, idx) => {
                const isPositive = comp.value >= 0;
                const barWidth = Math.min(Math.abs(comp.value) * 2.2, 100);

                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 truncate">{comp.feature}</span>
                      <span className={`font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPositive ? `+${comp.value}` : comp.value} pts
                      </span>
                    </div>
                    {/* Visual contribution bar */}
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full rounded-full ${isPositive ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-slate-500">{comp.description}</div>
                  </div>
                );
              })}
            </div>

            {/* Asset Telemetry Footprint */}
            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 grid grid-cols-2 gap-1.5">
              <div>
                GMT: <span className="text-white font-semibold">{xaiData.yearly_gmt}</span>
              </div>
              <div>
                TGI: <span className="text-white font-semibold">{xaiData.tgi_index}</span>
              </div>
              <div>
                Active PSR:{" "}
                <span className={xaiData.has_psr ? "text-amber-400 font-semibold" : "text-slate-500"}>
                  {xaiData.has_psr ? `${xaiData.psr_speed_kmph} km/h` : "None"}
                </span>
              </div>
              <div>
                Rule Base: <span className="text-sky-300 font-semibold">{xaiData.rule_criticality_score}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 py-2">Select a block to inspect feature weights.</div>
        )}
      </div>
    </div>
  );
};

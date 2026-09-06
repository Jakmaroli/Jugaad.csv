"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ShieldAlert,
  FileCheck,
  TrendingUp,
  AlertOctagon,
  RefreshCw,
  Sliders,
  ChevronRight,
  Copy,
  Check,
  Wrench,
  Radio,
  Share2,
  X,
  ExternalLink,
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
  onClose?: () => void;
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
  onClose,
}) => {
  const [actor, setActor] = useState("Section Controller SC_01");
  const [rejectReason, setRejectReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [copiedPN, setCopiedPN] = useState(false);

  // Manual Reschedule state
  const [reschedStart, setReschedStart] = useState("11:35");
  const [reschedEnd, setReschedEnd] = useState("13:35");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [simResult, setSimResult] = useState<RescheduleSimResult | null>(null);

  // Local XAI state
  const [xaiData, setXaiData] = useState<XAIData | null>(null);
  const [loadingXAI, setLoadingXAI] = useState(false);

  // Success / Certificate Feedback
  const [lastActionMessage, setLastActionMessage] = useState<{
    type: "success" | "error";
    title: string;
    pn?: string;
    detail: string;
    blockId?: string;
    timestamp?: string;
  } | null>(null);

  // Sync default reschedule times with selected block approved window
  useEffect(() => {
    if (selectedBlock?.approved_start && selectedBlock?.approved_end) {
      setReschedStart(selectedBlock.approved_start.slice(11, 16));
      setReschedEnd(selectedBlock.approved_end.slice(11, 16));
    } else {
      setReschedStart("11:35");
      setReschedEnd("13:35");
    }
  }, [selectedBlock?.block_id]);

  // Load XAI whenever selected block changes
  useEffect(() => {
    if (!selectedBlock) {
      setXaiData(null);
      setSimResult(null);
      return;
    }

    let isMounted = true;
    setLoadingXAI(true);

    fetchLocalXAI(selectedBlock.block_id)
      .then((data) => {
        if (isMounted) setXaiData(data);
      })
      .catch((err) => {
        console.error("Failed to load XAI:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingXAI(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedBlock?.block_id]);

  // Handle Approve Block -> Generate Statutory PN
  const handleApprove = async () => {
    if (!selectedBlock) return;
    setIsApproving(true);
    setLastActionMessage(null);
    try {
      const res = await approveBlock(selectedBlock.block_id, actor);
      setLastActionMessage({
        type: "success",
        title: "Statutory Sanction Authority Granted",
        pn: res.private_number,
        detail: `Block ${selectedBlock.block_id} officially sanctioned on ${selectedBlock.segment_id}. Private Number issued to Field SSE.`,
        blockId: selectedBlock.block_id,
        timestamp: new Date().toLocaleTimeString(),
      });
      onActionSuccess();
    } catch (err: any) {
      setLastActionMessage({
        type: "error",
        title: "Sanction Failed",
        detail: err.message || "Failed to approve block.",
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject Block
  const handleReject = async () => {
    if (!selectedBlock) return;
    if (!rejectReason) {
      alert("Please provide a reason for rejecting this block request.");
      return;
    }
    setIsRejecting(true);
    setLastActionMessage(null);
    try {
      await rejectBlock(selectedBlock.block_id, rejectReason, actor);
      setLastActionMessage({
        type: "error",
        title: "Block Request Rejected",
        detail: `Block ${selectedBlock.block_id} rejected. Reason logged to decision audit: "${rejectReason}"`,
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

  // Nudge time helper
  const handleNudge = (deltaMinutes: number) => {
    try {
      const [sh, sm] = reschedStart.split(":").map(Number);
      const [eh, em] = reschedEnd.split(":").map(Number);
      const startMin = sh * 60 + sm + deltaMinutes;
      const endMin = eh * 60 + em + deltaMinutes;

      const formatTime = (totalMin: number) => {
        const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMin));
        const h = Math.floor(clamped / 60);
        const m = clamped % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      };

      setReschedStart(formatTime(startMin));
      setReschedEnd(formatTime(endMin));
      setSimResult(null);
    } catch (e) {
      // ignore
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
        title: "Manual Reschedule Sanctioned",
        pn: res.private_number,
        detail: `Block ${selectedBlock.block_id} rescheduled to ${reschedStart}-${reschedEnd}. Statutory Private Number issued.`,
        blockId: selectedBlock.block_id,
        timestamp: new Date().toLocaleTimeString(),
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

  const copyPN = (pn: string) => {
    navigator.clipboard.writeText(pn);
    setCopiedPN(true);
    setTimeout(() => setCopiedPN(false), 2000);
  };

  // Department icon helper
  const getDeptIcon = (dept: string) => {
    if (dept.toUpperCase().includes("ENG")) return <Wrench className="w-3.5 h-3.5 text-emerald-400" />;
    if (dept.toUpperCase().includes("SIG")) return <Radio className="w-3.5 h-3.5 text-blue-400" />;
    return <Zap className="w-3.5 h-3.5 text-pink-400" />;
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-5 shadow-2xl flex flex-col space-y-5 backdrop-blur-xl">
      {/* Header with Title & Close Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-wide uppercase">
              Section Controller Decision Console
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Human-in-the-Loop Sanction & XAI Inspector
            </span>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Block Selector Tabs / Chips */}
      <div>
        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 font-semibold">
          Select Corridor Block Demand
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {allBlocks.slice(0, 3).map((b) => {
            const isSelected = selectedBlock?.block_id === b.block_id;
            const isApproved = b.status === "Approved" || b.status === "Granted";

            return (
              <button
                key={b.block_id}
                onClick={() => onSelectBlock(b.block_id)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-sky-500/20 border-sky-400 ring-2 ring-sky-500/30 shadow-md"
                    : "bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getDeptIcon(b.department)}
                    <span className="text-xs font-bold text-white">{b.block_id}</span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      isApproved
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : "bg-amber-950 text-amber-300 border border-amber-800"
                    }`}
                  >
                    {isApproved ? "Approved" : "Pending"}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-400 truncate">
                  {b.department} • Pri {b.priority_weight}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Statutory Private Number (PN) Certificate Slip (If Approved) */}
      {lastActionMessage && lastActionMessage.type === "success" && lastActionMessage.pn && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border-2 border-emerald-500 p-4 shadow-2xl animate-fadeIn">
          <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-between border-b border-emerald-700/40 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                INDIAN RAILWAYS • CONTROL OFFICE APPLICATION (COA)
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-400">{lastActionMessage.timestamp}</span>
          </div>

          <div className="space-y-2 font-mono">
            <div className="flex items-center justify-between bg-black/50 p-2.5 rounded-lg border border-emerald-600/40">
              <div>
                <span className="text-[10px] text-slate-400 block">STATUTORY PRIVATE NUMBER</span>
                <span className="text-base font-black text-white tracking-widest text-emerald-300">
                  {lastActionMessage.pn}
                </span>
              </div>
              <button
                onClick={() => copyPN(lastActionMessage.pn!)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-900/60 hover:bg-emerald-800 text-xs text-white border border-emerald-600 transition-colors cursor-pointer"
              >
                {copiedPN ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPN ? "Copied" : "Copy PN"}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              {lastActionMessage.detail}
            </p>
          </div>
        </div>
      )}

      {/* Selected Block Dossier Card */}
      {selectedBlock && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Department / Type:</span>
            <span className="text-white font-bold flex items-center gap-1.5">
              {getDeptIcon(selectedBlock.department)}
              <span>
                {selectedBlock.department} ({selectedBlock.block_type})
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Location:</span>
            <span className="text-sky-300 font-semibold">
              {selectedBlock.segment_id} (Km {selectedBlock.km_start}–{selectedBlock.km_end})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">CP-SAT Optimized Slot:</span>
            <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              {selectedBlock.approved_start ? selectedBlock.approved_start.slice(11, 16) : "--:--"} →{" "}
              {selectedBlock.approved_end ? selectedBlock.approved_end.slice(11, 16) : "--:--"} (120 min)
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-slate-300 text-[11px] leading-relaxed">
            <span className="text-slate-500 block mb-0.5 font-bold uppercase text-[9px]">
              Work Order & Equipment:
            </span>
            <span>{selectedBlock.work_description}</span>
          </div>
        </div>
      )}

      {/* Controller Actor Sign-off Field */}
      <div>
        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
          Authorizing Officer (Duty Section Controller)
        </label>
        <input
          type="text"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
          placeholder="Section Controller Identity"
        />
      </div>

      {/* Primary Sanction & Reject Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={handleApprove}
          disabled={isApproving || !selectedBlock}
          className="flex items-center justify-center space-x-2 px-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all disabled:opacity-50 cursor-pointer"
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
          className="flex items-center justify-center space-x-2 px-3 py-3 rounded-xl bg-rose-900/40 hover:bg-rose-900/70 active:scale-98 border border-rose-700/60 text-rose-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
        >
          {isRejecting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span>Reject Request</span>
        </button>
      </div>

      {/* Optional Reject Justification Field */}
      <div>
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Justification note if rejecting block..."
          className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 font-mono focus:border-rose-500 focus:outline-none placeholder:text-slate-600"
        />
      </div>

      {/* ================= SECTION: INTERACTIVE WHAT-IF TIME SHIFTER ================= */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-inner">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Interactive What-If Schedule Shifter</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">P0 Conflict Check</span>
        </div>

        {/* Nudge buttons */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <button
            onClick={() => handleNudge(-30)}
            className="flex-1 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            -30m
          </button>
          <button
            onClick={() => handleNudge(-15)}
            className="flex-1 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            -15m
          </button>
          <button
            onClick={() => {
              setReschedStart("11:35");
              setReschedEnd("13:35");
              setSimResult(null);
            }}
            className="flex-1 py-1 rounded bg-sky-950 hover:bg-sky-900 border border-sky-700 text-[10px] font-mono text-sky-300 font-bold transition-colors cursor-pointer"
          >
            Optimal
          </button>
          <button
            onClick={() => handleNudge(15)}
            className="flex-1 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            +15m
          </button>
          <button
            onClick={() => handleNudge(30)}
            className="flex-1 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            +30m
          </button>
        </div>

        {/* Time Inputs */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[9px] font-mono text-slate-400 block mb-0.5">Start (HH:MM)</label>
            <input
              type="time"
              value={reschedStart}
              onChange={(e) => {
                setReschedStart(e.target.value);
                setSimResult(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="text-[9px] font-mono text-slate-400 block mb-0.5">End (HH:MM)</label>
            <input
              type="time"
              value={reschedEnd}
              onChange={(e) => {
                setReschedEnd(e.target.value);
                setSimResult(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
            />
          </div>
        </div>

        {/* Simulate button */}
        <button
          onClick={handleSimulate}
          disabled={isSimulating || !selectedBlock}
          className="w-full py-2 rounded-xl bg-sky-950/90 hover:bg-sky-900 border border-sky-600/70 text-sky-300 text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow"
        >
          {isSimulating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <TrendingUp className="w-3.5 h-3.5" />
          )}
          <span>Simulate Delay & Train Clash</span>
        </button>

        {/* Simulation Output Card */}
        {simResult && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono space-y-2 animate-fadeIn ${
              simResult.conflict_count === 0
                ? "bg-emerald-950/50 border-emerald-600 text-emerald-300"
                : "bg-red-950/50 border-red-600 text-red-300"
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>Safety Evaluation:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] ${
                  simResult.conflict_count === 0 ? "bg-emerald-900 text-emerald-200" : "bg-red-900 text-red-200"
                }`}
              >
                {simResult.conflict_count === 0 ? "0 CONFLICTS SAFE" : `${simResult.conflict_count} TRAIN CLASHES`}
              </span>
            </div>

            <div className="text-[11px] text-slate-300">
              Primary Delay: <span className="font-bold text-white">{simResult.total_primary_delay_minutes}m</span> •
              Cascade Delay: <span className="font-bold text-white">{simResult.total_cascade_delay_minutes}m</span>
            </div>

            {simResult.conflict_count > 0 && simResult.train_conflicts.length > 0 && (
              <div className="pt-1 text-[10px] text-red-300 space-y-1">
                {simResult.train_conflicts.map((tc, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <AlertOctagon className="w-3 h-3 text-red-400 shrink-0" />
                    <span>Collides with {tc.train_number} {tc.train_name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Commit Reschedule Button */}
            <button
              onClick={handleConfirmReschedule}
              disabled={simResult.conflict_count > 0 || isConfirming}
              className={`w-full mt-2 py-2 rounded-lg text-xs font-bold font-mono flex items-center justify-center space-x-1.5 transition-all ${
                simResult.conflict_count === 0
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
              }`}
            >
              {isConfirming ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Commit Reschedule & Issue PN</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= SECTION: LOCAL EXPLAINABLE AI (XAI) ================= */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Explainable AI (XAI) Priority Attribution</span>
          </div>
          <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
            Score: {selectedBlock?.priority_weight || 0} / 100
          </span>
        </div>

        {loadingXAI ? (
          <div className="py-4 flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
            <RefreshCw className="w-4 h-4 animate-spin mb-1 text-amber-400" />
            <span>Calculating feature attribution weights...</span>
          </div>
        ) : xaiData ? (
          <div className="space-y-2.5 text-xs font-mono">
            <p className="text-[11px] text-slate-400">
              Feature contributions driving this possession block's priority ranking:
            </p>

            <div className="space-y-2">
              {xaiData.components.map((comp, idx) => {
                const isPositive = comp.value >= 0;
                const barWidth = Math.min(Math.abs(comp.value) * 2.2, 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-200 font-medium truncate">{comp.feature}</span>
                      <span className={`font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPositive ? `+${comp.value}` : comp.value} pts
                      </span>
                    </div>
                    {/* Visual contribution bar */}
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPositive ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-rose-500"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-slate-400 leading-snug">{comp.description}</div>
                  </div>
                );
              })}
            </div>

            {/* Asset Telemetry Footprint */}
            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400 grid grid-cols-2 gap-2">
              <div>
                Traffic GMT: <span className="text-white font-bold">{xaiData.yearly_gmt}</span>
              </div>
              <div>
                TGI Index: <span className="text-white font-bold">{xaiData.tgi_index}</span>
              </div>
              <div>
                Active PSR:{" "}
                <span className={xaiData.has_psr ? "text-amber-400 font-bold" : "text-slate-500"}>
                  {xaiData.has_psr ? `${xaiData.psr_speed_kmph} km/h` : "None"}
                </span>
              </div>
              <div>
                Rule Base: <span className="text-sky-300 font-bold">{xaiData.rule_criticality_score}</span>
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

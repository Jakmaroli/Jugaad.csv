"use client";

import React from "react";
import {
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Train,
  ArrowRight,
  TrendingDown,
  Layers,
  FileCheck,
  Zap,
} from "lucide-react";

interface ExecutiveStoryProps {
  onNavigateToSchedule: () => void;
  onNavigateToActions: () => void;
  kpis: any;
}

export const ExecutiveStoryTab: React.FC<ExecutiveStoryProps> = ({
  onNavigateToSchedule,
  onNavigateToActions,
  kpis,
}) => {
  const minutesSaved = kpis?.corridor_savings?.minutes_saved || 150;
  const pctSaved = kpis?.corridor_savings?.percentage_saved || 55.6;
  const manualMinutes = kpis?.corridor_savings?.manual_fifo_minutes || 270;
  const bundledMinutes = kpis?.corridor_savings?.cpsat_bundled_minutes || 120;
  const speedup = kpis?.distributed_solve?.speedup_factor || 6.1;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Hero Problem & Solution Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Executive Problem & Impact Overview</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
            Transforming Indian Railways Track Possession from{" "}
            <span className="text-rose-400 underline decoration-rose-500/40">Uncoordinated Chaos</span> to{" "}
            <span className="text-emerald-400 underline decoration-emerald-500/40">AI-Bundled Precision</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Every day, Civil Engineering, Signal & Telecom (S&T), and Overhead Traction (TRD) request track blocks independently. 
            Without intelligent co-scheduling, they collide with high-speed passenger trains and halt corridor traffic multiple times. 
            Our decision-support system resolves this in seconds.
          </p>
        </div>

        {/* Quick navigation buttons */}
        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onNavigateToSchedule}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-950 transition-all hover:scale-102 cursor-pointer"
          >
            <span>View Live Corridor Schedule</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToActions}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition-all hover:scale-102 cursor-pointer"
          >
            <span>Simulate Controller Actions</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* 3-Step Visual Journey Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: The Problem */}
        <div className="rounded-2xl bg-slate-900/90 border border-rose-900/40 p-6 shadow-xl relative flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold mb-1">
              Step 1: The Real Problem
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Uncoordinated Requests</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              3 departments simultaneously demanded urgent track possession on Segment 35 (Km 34.0–35.0):
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span><strong>Civil Eng:</strong> Rail fracture repair (Needs 120 min)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span><strong>Signal:</strong> Switch machine failure (Needs 60 min)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span><strong>Traction:</strong> Misaligned OHE mast (Needs 90 min)</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-rose-950/80 bg-rose-950/20 -mx-6 -mb-6 p-4 rounded-b-2xl">
            <div className="text-[11px] text-rose-300 font-mono">
              <strong>Unoptimized Outcome:</strong> 270 minutes of track shutdown and 55 min passenger train delay.
            </div>
          </div>
        </div>

        {/* Step 2: The Solution */}
        <div className="rounded-2xl bg-slate-900/90 border border-sky-900/50 p-6 shadow-xl relative flex flex-col justify-between ring-1 ring-sky-500/20">
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold mb-1">
              Step 2: The AI Solution
            </div>
            <h3 className="text-lg font-bold text-white mb-2">CP-SAT Shadow Bundling</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Our constraint solver finds the optimal natural gap between trains and clusters all 3 departments:
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span><strong>Co-located Slot:</strong> Exactly <strong>11:35 – 13:35</strong> (120 mins)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span><strong>Multi-Disciplinary:</strong> All 3 repairs happen in parallel safely</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span><strong>Safety Headway:</strong> 10-minute buffers protect approaching trains</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-sky-950/80 bg-sky-950/20 -mx-6 -mb-6 p-4 rounded-b-2xl">
            <div className="text-[11px] text-sky-300 font-mono">
              <strong>Optimized Outcome:</strong> Down to 120 mins possession. Zero delays on Shatabdi & Rajdhani.
            </div>
          </div>
        </div>

        {/* Step 3: Human Authority */}
        <div className="rounded-2xl bg-slate-900/90 border border-emerald-900/40 p-6 shadow-xl relative flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
              Step 3: Human Authority
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Statutory Sanctioning</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              The AI advises; the Section Controller retains legal statutory accountability:
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span><strong>1-Click Approval:</strong> Controller inspects safety score</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span><strong>Statutory Number:</strong> System mints Private Number (e.g. <code>PN-4821</code>)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span><strong>Audit Log:</strong> Immutable logging of who, when, and why</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-emerald-950/80 bg-emerald-950/20 -mx-6 -mb-6 p-4 rounded-b-2xl">
            <div className="text-[11px] text-emerald-300 font-mono">
              <strong>Statutory Compliance:</strong> Fully matches General Rules (GR) & Subsidiary Rules (SR).
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Scorecard: Unoptimized Manual vs AI Co-scheduling */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <span>Defensible Mathematical Proof: Manual FIFO vs CP-SAT Bundling</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
          {/* Left: Manual Baseline */}
          <div className="p-4 rounded-xl bg-slate-950 border border-rose-900/30">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-rose-400 font-bold">
              <span>UNCOORDINATED MANUAL FIFO</span>
              <span>270 MIN SHUTDOWN</span>
            </div>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Civil Track Possession:</span>
                <span className="text-white">120 mins</span>
              </div>
              <div className="flex justify-between">
                <span>Signal Interlocking Downtime:</span>
                <span className="text-white">60 mins</span>
              </div>
              <div className="flex justify-between">
                <span>OHE Traction Power Outage:</span>
                <span className="text-white">90 mins</span>
              </div>
              <div className="flex justify-between font-semibold text-rose-400 pt-2 border-t border-slate-800">
                <span>Train Arrival Delay:</span>
                <span>+55 mins delay</span>
              </div>
            </div>
          </div>

          {/* Right: CP-SAT Bundled */}
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/40">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-emerald-400 font-bold">
              <span>CP-SAT CO-LOCATED BUNDLE</span>
              <span>120 MIN WINDOW</span>
            </div>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Civil + Signal + OHE:</span>
                <span className="text-white">All 3 inside 11:35 - 13:35</span>
              </div>
              <div className="flex justify-between">
                <span>Corridor Downtime Saved:</span>
                <span className="text-emerald-400 font-bold">150 mins saved (55.6%)</span>
              </div>
              <div className="flex justify-between">
                <span>Safety Buffer Enforced:</span>
                <span className="text-white">10 min headway on both sides</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-400 pt-2 border-t border-slate-800">
                <span>Train Arrival Delay:</span>
                <span>0 mins (100% on-time)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

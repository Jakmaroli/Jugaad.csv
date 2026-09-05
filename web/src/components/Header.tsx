"use client";

import React from "react";
import {
  Train,
  ShieldAlert,
  Cpu,
  Activity,
  Clock,
  UserCheck,
  RefreshCw,
  Sparkles,
  Calendar,
  Zap,
  BarChart3,
} from "lucide-react";

export type NavTab = "story" | "schedule" | "actions" | "analytics";

interface HeaderProps {
  apiOnline: boolean;
  onRefresh?: () => void;
  activeNav: NavTab;
  onChangeNav: (nav: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  apiOnline,
  onRefresh,
  activeNav,
  onChangeNav,
}) => {
  return (
    <header className="relative bg-[#07111e] border-b border-slate-800 shadow-2xl sticky top-0 z-50 backdrop-blur-md">
      {/* Top Utility / Identity Bar */}
      <div className="border-b border-slate-800/60 px-6 py-3.5">
        <div className="max-w-[1680px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left: Branding & Problem Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30 shrink-0">
              <Train className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  INDIAN RAILWAYS <span className="text-sky-400 font-normal">|</span> BLOCK PLANNING DECISION COCKPIT
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  SIH26027
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Multi-Departmental Possession Scheduling & Dynamic Bundling</span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-slate-300">SER Kharagpur Division (100 km Corridor)</span>
              </p>
            </div>
          </div>

          {/* Right: Status Badges */}
          <div className="flex items-center gap-3">
            {/* Refresh Action */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Sync corridor state with FastAPI"
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-mono shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Data</span>
              </button>
            )}

            {/* Live API Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiOnline ? "bg-emerald-400 animate-pulse" : "bg-red-500"
                }`}
              />
              <span className="text-slate-300 font-mono text-xs">
                {apiOnline ? "FastAPI Online" : "Backend Offline"}
              </span>
            </div>

            {/* Operational Horizon */}
            <div className="hidden sm:flex px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Horizon</div>
                <div className="text-slate-200 font-mono font-bold text-xs">Tue, Sep 8, 2026</div>
              </div>
            </div>

            {/* Operator Badge */}
            <div className="hidden md:flex px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Duty Controller</div>
                <div className="text-slate-200 font-bold text-xs">SC_01 (KGP Control)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Top Navigation Tabs */}
      <div className="px-6 bg-slate-950/60 border-b border-slate-800/80">
        <div className="max-w-[1680px] mx-auto flex items-center gap-1 py-1 overflow-x-auto">
          <button
            onClick={() => onChangeNav("story")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeNav === "story"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Executive Story & Impact</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
              Start Here
            </span>
          </button>

          <button
            onClick={() => onChangeNav("schedule")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeNav === "schedule"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Corridor Schedule (Map & Gantt)</span>
          </button>

          <button
            onClick={() => onChangeNav("actions")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeNav === "actions"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Controller Actions & XAI</span>
          </button>

          <button
            onClick={() => onChangeNav("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeNav === "analytics"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Deep Algorithmic Analytics</span>
          </button>
        </div>
      </div>
    </header>
  );
};

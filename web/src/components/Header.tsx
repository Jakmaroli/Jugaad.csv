"use client";

import React from "react";
import {
  Train,
  Cpu,
  Clock,
  UserCheck,
  RefreshCw,
  Sparkles,
  Calendar,
  Zap,
  BarChart3,
  Sliders,
  ShieldCheck,
} from "lucide-react";

export type NavTab = "operations" | "story" | "analytics" | "schedule" | "actions";

interface HeaderProps {
  apiOnline: boolean;
  onRefresh?: () => void;
  activeNav: string;
  onChangeNav: (nav: "operations" | "story" | "analytics") => void;
  isTourOpen: boolean;
  onToggleTour: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  apiOnline,
  onRefresh,
  activeNav,
  onChangeNav,
  isTourOpen,
  onToggleTour,
}) => {
  // Normalize tab for active styling
  const currentTab =
    activeNav === "schedule" || activeNav === "actions" || activeNav === "operations"
      ? "operations"
      : activeNav;

  return (
    <header className="relative bg-[#07111e] border-b border-slate-800 shadow-2xl sticky top-0 z-50 backdrop-blur-md">
      {/* Top Utility / Identity Bar */}
      <div className="border-b border-slate-800/60 px-4 sm:px-6 py-3">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left: Branding & Problem Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30 shrink-0">
              <Train className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  INDIAN RAILWAYS <span className="text-sky-400 font-normal">|</span> BLOCK PLANNING COCKPIT
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-mono">
                  SIH26027
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Multi-Departmental Possession Scheduling & Dynamic Bundling</span>
                <span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:inline" />
                <span className="text-slate-300 hidden sm:inline">SER Kharagpur Division (100 km Corridor)</span>
              </p>
            </div>
          </div>

          {/* Right: Actions & Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Guided Tour Trigger Button */}
            <button
              onClick={onToggleTour}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isTourOpen
                  ? "bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-sky-500/20"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>{isTourOpen ? "Guided Tour Active" : "Start Guided Tour"}</span>
            </button>

            {/* Refresh Action */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Sync corridor state with FastAPI"
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-mono shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Sync</span>
              </button>
            )}

            {/* Live API Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="text-slate-300 font-mono text-xs">
                {apiOnline ? "FastAPI Live" : "Demo Simulation"}
              </span>
            </div>

            {/* Operational Horizon */}
            <div className="hidden lg:flex px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Horizon</div>
                <div className="text-slate-200 font-mono font-bold text-xs">Tue, Sep 8, 2026</div>
              </div>
            </div>

            {/* Operator Badge */}
            <div className="hidden xl:flex px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Duty Controller</div>
                <div className="text-slate-200 font-bold text-xs">SC_01 (KGP Control)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Top Navigation Tabs */}
      <div className="px-4 sm:px-6 bg-slate-950/70 border-b border-slate-800/80">
        <div className="max-w-[1720px] mx-auto flex items-center gap-1.5 py-1.5 overflow-x-auto">
          {/* Tab 1: Unified Operations Cockpit */}
          <button
            onClick={() => onChangeNav("operations")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === "operations"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Corridor Operations & Dispatch</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
              Live Cockpit
            </span>
          </button>

          {/* Tab 2: Executive Story & Impact */}
          <button
            onClick={() => onChangeNav("story")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === "story"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Executive Story & Impact</span>
          </button>

          {/* Tab 3: Deep Algorithmic Analytics */}
          <button
            onClick={() => onChangeNav("analytics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === "analytics"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Deep Algorithmic Proofs & Audits</span>
          </button>
        </div>
      </div>
    </header>
  );
};

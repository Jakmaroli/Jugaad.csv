"use client";

import React from "react";
import { Train, ShieldAlert, Cpu, Activity, Clock, UserCheck, RefreshCw } from "lucide-react";

interface HeaderProps {
  apiOnline: boolean;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ apiOnline, onRefresh }) => {
  return (
    <header className="relative bg-gradient-to-r from-[#07111e] via-[#0c1a2e] to-[#07111e] border-b border-slate-800/80 px-6 py-4 shadow-2xl">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Branding & Problem Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30">
            <Train className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                INDIAN RAILWAYS <span className="text-sky-400 font-normal">|</span> BLOCK PLANNING COCKPIT
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                SIH26027
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Multi-Departmental Possession Scheduling & Dynamic Bundling Advisory System</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="text-slate-300">SER Kharagpur Division (100 km Corridor)</span>
            </p>
          </div>
        </div>

        {/* Right: Operational Horizon & Operator Badge */}
        <div className="flex items-center gap-3">
          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Sync corridor state with FastAPI"
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}

          {/* Live API Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-slate-300 font-mono">{apiOnline ? "FastAPI 8000 Active" : "Backend Offline"}</span>
          </div>

          {/* Operational Horizon */}
          <div className="px-3.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Horizon</div>
              <div className="text-slate-200 font-mono font-bold">Tue, Sep 8, 2026</div>
            </div>
          </div>

          {/* Operator Badge */}
          <div className="px-3.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Section Controller</div>
              <div className="text-slate-200 font-bold">SC_01 (KGP Control)</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

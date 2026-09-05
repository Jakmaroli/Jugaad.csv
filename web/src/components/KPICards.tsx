"use client";

import React from "react";
import { ArrowDownRight, Clock, AlertTriangle, Zap, CheckCircle2, TrendingUp } from "lucide-react";

interface KPIData {
  corridor_savings: {
    minutes_saved: number;
    percentage_saved: number;
    manual_fifo_minutes: number;
    cpsat_bundled_minutes: number;
  };
  punctuality: {
    primary_delay_minutes: number;
    cascade_delay_minutes: number;
    total_delay_minutes: number;
    is_on_time: boolean;
    on_time_pct: number;
  };
  defects_backlog: {
    total: number;
    tms: number;
    smms: number;
    tdms: number;
  };
  distributed_solve: {
    decomposed_time_ms: number;
    sub_areas_count: number;
    centralized_time_ms: number;
    speedup_factor: number;
  };
}

interface KPICardsProps {
  kpis: KPIData | null;
  loading: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis, loading }) => {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-800/40 rounded-xl border border-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Corridor Downtime Savings */}
      <div className="relative overflow-hidden rounded-xl bg-[#0d1624] border border-slate-800/80 p-4 shadow-xl hover:border-sky-500/40 transition-all duration-300 group">
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-sky-500 to-emerald-500" />
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Corridor Possession Savings
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1 flex items-baseline gap-2">
              <span>{kpis.corridor_savings.minutes_saved} Mins Saved</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <span className="text-emerald-400 font-semibold">{kpis.corridor_savings.percentage_saved}% Improvement</span>
          <span>•</span>
          <span className="font-mono text-slate-500">
            {kpis.corridor_savings.manual_fifo_minutes}m FIFO &rarr; {kpis.corridor_savings.cpsat_bundled_minutes}m bundled
          </span>
        </div>
      </div>

      {/* Card 2: Operational Punctuality */}
      <div className="relative overflow-hidden rounded-xl bg-[#0d1624] border border-slate-800/80 p-4 shadow-xl hover:border-emerald-500/40 transition-all duration-300 group">
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Operational Punctuality
            </div>
            <div className={`text-2xl font-black mt-1 ${kpis.punctuality.is_on_time ? "text-emerald-400" : "text-amber-400"}`}>
              {kpis.punctuality.primary_delay_minutes}m Pri | {kpis.punctuality.cascade_delay_minutes}m Cas
            </div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <span className="text-emerald-400 font-semibold">{kpis.punctuality.on_time_pct}% On-Time</span>
          <span>•</span>
          <span className="text-slate-500 font-mono">&ge; 10-Min Headway Guaranteed</span>
        </div>
      </div>

      {/* Card 3: Active Defects Backlog */}
      <div className="relative overflow-hidden rounded-xl bg-[#0d1624] border border-slate-800/80 p-4 shadow-xl hover:border-amber-500/40 transition-all duration-300 group">
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Active Telemetry Defects
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {kpis.defects_backlog.total} Ingested
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 font-mono">
          <span className="text-slate-300 font-semibold">TMS: {kpis.defects_backlog.tms}</span>
          <span>|</span>
          <span className="text-slate-300 font-semibold">SMMS: {kpis.defects_backlog.smms}</span>
          <span>|</span>
          <span className="text-slate-300 font-semibold">TDMS: {kpis.defects_backlog.tdms}</span>
        </div>
      </div>

      {/* Card 4: Decomposed Distributed Solve */}
      <div className="relative overflow-hidden rounded-xl bg-[#0d1624] border border-slate-800/80 p-4 shadow-xl hover:border-purple-500/40 transition-all duration-300 group">
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 to-indigo-500" />
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Distributed Parallel Solve
            </div>
            <div className="text-2xl font-black text-purple-400 mt-1 font-mono">
              {kpis.distributed_solve.decomposed_time_ms} ms
            </div>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <span className="text-purple-400 font-semibold">{kpis.distributed_solve.sub_areas_count} Sub-Areas Parallel</span>
          <span>•</span>
          <span className="text-slate-500 font-mono">Lippes 2020 TU Delft</span>
        </div>
      </div>
    </div>
  );
};

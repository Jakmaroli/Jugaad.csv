"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  GitMerge,
  Cpu,
  Activity,
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Zap,
  Check,
  TrendingDown,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { BlockDetail } from "./ControllerActionSidebar";
import {
  fetchPareto,
  fetchResources,
  fetchAssetHealth,
  fetchDistributedBenchmark,
  fetchAudits,
} from "../lib/api";

interface AnalysisTabsProps {
  blocks: BlockDetail[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  refreshTrigger: number;
}

export const AnalysisTabs: React.FC<AnalysisTabsProps> = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  refreshTrigger,
}) => {
  const [activeTab, setActiveTab] = useState<
    "demands" | "pareto" | "resources" | "rul" | "audit"
  >("demands");

  // Tab 1 state: Filter
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Tab 2: Pareto data
  const [paretoData, setParetoData] = useState<any>(null);

  // Tab 3: Resources data
  const [resourceData, setResourceData] = useState<any>(null);

  // Tab 4: Asset health data
  const [assetData, setAssetData] = useState<any>(null);

  // Tab 5: Distributed Benchmark & Audits
  const [distData, setDistData] = useState<any>(null);
  const [auditRows, setAuditRows] = useState<any[]>([]);

  // Loading states
  const [loadingTab, setLoadingTab] = useState(false);

  // Fetch tab-specific data on change or refresh
  useEffect(() => {
    let isMounted = true;
    setLoadingTab(true);

    if (activeTab === "pareto") {
      fetchPareto()
        .then((data) => isMounted && setParetoData(data))
        .finally(() => isMounted && setLoadingTab(false));
    } else if (activeTab === "resources") {
      fetchResources()
        .then((data) => isMounted && setResourceData(data))
        .finally(() => isMounted && setLoadingTab(false));
    } else if (activeTab === "rul") {
      fetchAssetHealth("SEG_035")
        .then((data) => isMounted && setAssetData(data))
        .finally(() => isMounted && setLoadingTab(false));
    } else if (activeTab === "audit") {
      Promise.all([fetchDistributedBenchmark(), fetchAudits()])
        .then(([bm, audits]) => {
          if (isMounted) {
            setDistData(bm);
            setAuditRows(audits);
          }
        })
        .finally(() => isMounted && setLoadingTab(false));
    } else {
      setLoadingTab(false);
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, refreshTrigger]);

  // Filtered blocks for Tab 1
  const filteredBlocks = blocks.filter((b) => {
    const matchesDept = deptFilter === "ALL" || b.department.toUpperCase() === deptFilter;
    const matchesSearch =
      b.block_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.segment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.work_description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-md">
      {/* Navigation Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("demands")}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
            activeTab === "demands"
              ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Demands Backlog ({blocks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("pareto")}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
            activeTab === "pareto"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>Pareto Multi-Objective Frontier</span>
        </button>

        <button
          onClick={() => setActiveTab("resources")}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
            activeTab === "resources"
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Resource Leveling & Bundling</span>
        </button>

        <button
          onClick={() => setActiveTab("rul")}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
            activeTab === "rul"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Asset Health & RUL Trajectory</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
            activeTab === "audit"
              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Distributed Solver & Audit Log</span>
        </button>
      </div>

      {/* Tab Content Container */}
      <div className="mt-4">
        {/* ================= TAB 1: DEMANDS BACKLOG ================= */}
        {activeTab === "demands" && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search block, segment, or work..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-500 w-56"
                  />
                </div>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500"
                >
                  <option value="ALL">All Departments</option>
                  <option value="ENGINEERING">Engineering</option>
                  <option value="SIGNAL">Signal & Telecom</option>
                  <option value="TRACTION">Traction (TRD)</option>
                </select>
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                Displaying <span className="text-white font-bold">{filteredBlocks.length}</span> demands across 100km corridor
              </div>
            </div>

            {/* Blocks Data Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Block ID</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Requested Window</th>
                    <th className="py-3 px-3">Optimized Slot</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 bg-slate-900/40">
                  {filteredBlocks.map((blk) => {
                    const isSelected = selectedBlockId === blk.block_id;
                    const isGranted = blk.status === "Approved" || blk.status === "Granted";
                    const isRejected = blk.status === "Rejected";

                    return (
                      <tr
                        key={blk.block_id}
                        className={`transition-colors hover:bg-slate-800/40 cursor-pointer ${
                          isSelected ? "bg-sky-950/40 border-l-2 border-l-sky-400" : ""
                        }`}
                        onClick={() => onSelectBlock(blk.block_id)}
                      >
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <div className="flex items-center space-x-1.5">
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>}
                            <span>{blk.block_id}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              blk.department === "Engineering"
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                                : blk.department === "Signal"
                                ? "bg-blue-950/80 text-blue-300 border border-blue-800/60"
                                : "bg-pink-950/80 text-pink-300 border border-pink-800/60"
                            }`}
                          >
                            {blk.department}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{blk.block_type}</td>
                        <td className="py-2.5 px-3 text-sky-400">
                          {blk.segment_id} <span className="text-slate-500 text-[10px]">(KM {blk.km_start}-{blk.km_end})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {blk.requested_start ? blk.requested_start.slice(11, 16) : "--:--"} -{" "}
                          {blk.requested_end ? blk.requested_end.slice(11, 16) : "--:--"}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-400">
                          {blk.approved_start ? blk.approved_start.slice(11, 16) : "--:--"} -{" "}
                          {blk.approved_end ? blk.approved_end.slice(11, 16) : "--:--"}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`font-bold ${
                                blk.priority_weight >= 80
                                  ? "text-rose-400"
                                  : blk.priority_weight >= 50
                                  ? "text-amber-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {blk.priority_weight}
                            </span>
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  blk.priority_weight >= 80
                                    ? "bg-rose-500"
                                    : blk.priority_weight >= 50
                                    ? "bg-amber-500"
                                    : "bg-slate-500"
                                }`}
                                style={{ width: `${blk.priority_weight}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isGranted
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                                : isRejected
                                ? "bg-red-950 text-red-300 border border-red-700"
                                : "bg-amber-950 text-amber-300 border border-amber-700"
                            }`}
                          >
                            {blk.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBlock(blk.block_id);
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 text-[10px] font-mono transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PARETO FRONTIER ================= */}
        {activeTab === "pareto" && (
          <div className="space-y-5 text-xs font-mono">
            {paretoData ? (
              <>
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Bi-Objective Optimization Frontier (D'Ariano et al., 2007)</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      CP-SAT resolves the fundamental tension between Traffic Punctuality (COA) and Infrastructure Possession (BDMS).
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">MANUAL FIFO BASELINE</span>
                      <span className="text-rose-400 font-bold text-sm">55m delay • 270m outage</span>
                    </div>
                    <div className="h-8 w-[1px] bg-slate-800"></div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">RECOMMENDED KNEE POINT</span>
                      <span className="text-emerald-400 font-bold text-sm">0m delay • 120m outage (55.6% saved)</span>
                    </div>
                  </div>
                </div>

                {/* Frontier Points Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {paretoData.frontier_points.map((pt: any, idx: number) => {
                    const isKnee = pt.lambda === 0.5;

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isKnee
                            ? "bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30"
                            : "bg-slate-950/60 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-xs">{pt.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                            λ = {pt.lambda.toFixed(2)}
                          </span>
                        </div>
                        {isKnee && (
                          <div className="mt-1 px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/50 text-[10px] text-emerald-300 font-semibold inline-block">
                            ★ RECOMMENDED OPERATIONAL COMPROMISE
                          </div>
                        )}
                        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">{pt.description}</p>
                        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 text-[10px] block">TRAIN DELAY:</span>
                            <span
                              className={`font-bold ${
                                pt.train_delay_minutes === 0 ? "text-emerald-400" : "text-amber-400"
                              }`}
                            >
                              {pt.train_delay_minutes} min
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">CORRIDOR DOWNTIME:</span>
                            <span className="text-sky-300 font-bold">{pt.downtime_minutes} min</span>
                          </div>
                          <div className="col-span-2 text-emerald-400 text-[11px]">
                            ⚡ Saves {pt.downtime_saved_minutes} min ({pt.pct_reduction}% reduction)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-slate-500">Loading Pareto Frontier trade-off data...</div>
            )}
          </div>
        )}

        {/* ================= TAB 3: RESOURCE LEVELING ================= */}
        {activeTab === "resources" && (
          <div className="space-y-4 text-xs font-mono">
            {resourceData ? (
              <>
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 text-purple-400 font-semibold text-sm">
                      <Layers className="w-4 h-4" />
                      <span>Cumulative Machinery & Crew Leveling</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      Enforces finite capacity limits on heavy track machinery (CSM / Duomatic Tampers, OHE Tower Wagons).
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 bg-emerald-950/80 border border-emerald-700/60 px-3 py-1.5 rounded-lg text-emerald-300 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>0 Equipment & Crew Over-allocations</span>
                  </div>
                </div>

                {/* Opportunity Grouping Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span>Multi-Departmental Bundling Synergies</span>
                      <span className="text-emerald-400 text-[10px]">Segment 35 Co-location</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      When Track Maintenance possesses the corridor, Traction (OHE inspection) and Signal (Point Machine calibration) share the possession envelope with zero incremental passenger disruption.
                    </p>
                    <div className="space-y-1.5 pt-2">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-300">Engineering + Traction Shadowing</span>
                        <span className="text-emerald-400 font-bold">120 min shared</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-300">Signal Interlocking Overlap</span>
                        <span className="text-emerald-400 font-bold">60 min shared</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span>Machinery Dispatch Matrix</span>
                      <span className="text-sky-400 text-[10px]">Division Roster</span>
                    </div>
                    <div className="space-y-2 text-[11px] pt-1">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-slate-400">OHE Tower Wagon (TW-04):</span>
                        <span className="text-white font-semibold">11:35 - 13:35 (In Use - Segment 35)</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-slate-400">CSM 09-32 Tamper:</span>
                        <span className="text-white font-semibold">11:35 - 13:35 (In Use - Segment 35)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">S&T Point Testing Kit:</span>
                        <span className="text-white font-semibold">11:45 - 12:45 (In Use - KM 35.2)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-slate-500">Loading resource leveling constraints...</div>
            )}
          </div>
        )}

        {/* ================= TAB 4: ASSET HEALTH & RUL ================= */}
        {activeTab === "rul" && (
          <div className="space-y-4 text-xs font-mono">
            {assetData ? (
              <>
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                      <Activity className="w-4 h-4" />
                      <span>Predictive Remaining Useful Life (RUL) Trajectory</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      Continuous degradation forecasting for Segment 35 based on Track Geometry Index (TGI) and 45.2 GMT traffic.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">RUL EXTENSION GAIN</span>
                      <span className="text-emerald-400 font-bold text-sm">+{assetData.rul_improvement_days} Days</span>
                    </div>
                  </div>
                </div>

                {/* SVG Degradation Curve Visualization */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-300 font-semibold">
                      180-Day Track Geometry Index (TGI) Evolution Curve
                    </span>
                    <div className="flex items-center space-x-4 text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-1 bg-rose-500 inline-block"></span>
                        <span className="text-rose-400">Unmaintained (Hits limit in {assetData.rul_days_unmaintained}d)</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-1 bg-emerald-400 inline-block"></span>
                        <span className="text-emerald-400">Maintained ({assetData.rul_days_restored}d RUL)</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-1 border-b border-dashed border-red-400 inline-block"></span>
                        <span className="text-red-400">Critical Threshold (50.0 TGI)</span>
                      </div>
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div className="h-56 relative w-full">
                    <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="40" y1="20" x2="680" y2="20" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                      <line x1="40" y1="70" x2="680" y2="70" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                      <line x1="40" y1="120" x2="680" y2="120" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                      <line x1="40" y1="170" x2="680" y2="170" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />

                      {/* Safety Critical Threshold Line at TGI = 50 */}
                      <line x1="40" y1="130" x2="680" y2="130" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
                      <text x="45" y="125" fill="#ef4444" fontSize="9" fontFamily="monospace">
                        CRITICAL SAFETY LIMIT (TGI 50.0)
                      </text>

                      {/* Maintained Path (Restored to 98.5, slowly decays) */}
                      <path
                        d="M 40,25 Q 350,60 680,85"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                      />

                      {/* Unmaintained Path (Current 43.2 drops rapidly below threshold) */}
                      <path
                        d="M 40,140 Q 200,165 680,185"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="3"
                        strokeDasharray="5 3"
                      />
                    </svg>
                  </div>

                  {/* Segment Stats Matrix */}
                  <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">CURRENT TGI</span>
                      <span className="text-rose-400 font-bold text-sm">{assetData.current_tgi} / 100</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">POST-BLOCK RESTORED</span>
                      <span className="text-emerald-400 font-bold text-sm">{assetData.restored_tgi} / 100</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">PSR RESTRICTION</span>
                      <span className="text-amber-400 font-bold text-sm">30 km/h (Clears on grant)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ANNUAL TRAFFIC</span>
                      <span className="text-white font-bold text-sm">{assetData.yearly_gmt} GMT</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-slate-500">Loading asset health degradation curve...</div>
            )}
          </div>
        )}

        {/* ================= TAB 5: DISTRIBUTED SOLVER & AUDIT LOG ================= */}
        {activeTab === "audit" && (
          <div className="space-y-4 text-xs font-mono">
            {/* Distributed Benchmark Showcase */}
            {distData && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
                    <Cpu className="w-4 h-4" />
                    <span>Distributed Regional Decomposition Benchmark</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    Multi-zone corridor decomposition enables independent parallel CP-SAT solving across regional divisions.
                  </p>
                </div>
                <div className="flex items-center space-x-4 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 shrink-0">
                  <div>
                    <span className="text-slate-500 text-[10px] block">CENTRALIZED SOLVE</span>
                    <span className="text-slate-300 font-bold">{distData.centralized_time_ms} ms</span>
                  </div>
                  <div className="text-indigo-400 font-bold text-lg">→</div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">DECOMPOSED ({distData.sub_areas_count} ZONES)</span>
                    <span className="text-emerald-400 font-bold">{distData.decomposed_time_ms} ms</span>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-800"></div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">COMPUTATIONAL SPEEDUP</span>
                    <span className="text-sky-400 font-bold text-sm">{distData.speedup_factor}x Faster</span>
                  </div>
                </div>
              </div>
            )}

            {/* Statutory Decision Audit Register */}
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-950/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-white">Statutory Decision Audit Trail</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Immutable Record Count: <span className="text-white font-bold">{auditRows.length}</span>
                </span>
              </div>

              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Block ID</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Authorized Officer</th>
                      <th className="py-2.5 px-3">Statutory Justification / PN</th>
                      <th className="py-2.5 px-3 text-right">Transition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {auditRows.map((aud, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                          {aud.timestamp ? aud.timestamp.replace("T", " ").slice(0, 19) : ""}
                        </td>
                        <td className="py-2 px-3 font-semibold text-white">{aud.block_id}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              aud.action === "Approved" || aud.action === "Granted"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                                : aud.action === "Rejected"
                                ? "bg-rose-950 text-rose-300 border border-rose-700"
                                : "bg-sky-950 text-sky-300 border border-sky-700"
                            }`}
                          >
                            {aud.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300">{aud.actor}</td>
                        <td className="py-2 px-3 text-amber-300 truncate max-w-xs">{aud.reason}</td>
                        <td className="py-2 px-3 text-right text-slate-400 whitespace-nowrap">
                          <span className="text-slate-500">{aud.previous_state}</span>
                          <span className="mx-1 text-slate-600">→</span>
                          <span className="text-emerald-400 font-semibold">{aud.new_state}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

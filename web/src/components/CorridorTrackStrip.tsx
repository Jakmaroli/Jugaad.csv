"use client";

import React, { useState } from "react";
import { Navigation, AlertOctagon, CheckCircle2, ShieldAlert, Zap, MapPin } from "lucide-react";

interface CorridorTrackStripProps {
  selectedSegment: string;
  onSelectSegment: (segmentId: string) => void;
  isBottleneckGranted: boolean;
}

export const CorridorTrackStrip: React.FC<CorridorTrackStripProps> = ({
  selectedSegment,
  onSelectSegment,
  isBottleneckGranted,
}) => {
  const [hoveredKm, setHoveredKm] = useState<number | null>(null);

  // Corridor segments overview
  const subAreas = [
    { id: "SA_01", name: "East Approach", range: "Km 0.0 – 35.0", kmStart: 0, kmEnd: 35, color: "border-sky-500/40" },
    { id: "SA_02", name: "Central Bottleneck", range: "Km 35.0 – 70.0", kmStart: 35, kmEnd: 70, color: "border-amber-500/50" },
    { id: "SA_03", name: "West Terminal", range: "Km 70.0 – 100.0", kmStart: 70, kmEnd: 100, color: "border-purple-500/40" },
  ];

  return (
    <div className="rounded-xl bg-[#0d1624] border border-slate-800/80 p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-400" />
            GEOGRAPHICAL CORRIDOR SCHEMATIC TRACK STRIP (100 KM)
          </h2>
          <p className="text-[11px] text-slate-400">
            Interactive corridor partitioning with real-time Permanent Speed Restrictions (PSR) and critical bottleneck telemetry
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Line Speed (130 km/h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-slate-300">Active PSR (30 km/h)</span>
          </div>
        </div>
      </div>

      {/* Visual Track Schematic */}
      <div className="relative py-4 px-2">
        {/* Railway rails (Double Track) */}
        <div className="relative h-12 flex items-center">
          {/* UP Line */}
          <div className="absolute top-3 left-0 right-0 h-1 bg-slate-700/80 rounded-full" />
          {/* DOWN Line */}
          <div className="absolute bottom-3 left-0 right-0 h-1 bg-slate-700/80 rounded-full" />
          
          {/* Sleepers graphic effect */}
          <div className="absolute inset-x-0 h-6 top-3 flex justify-between pointer-events-none opacity-20">
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} className="w-0.5 h-full bg-slate-400" />
            ))}
          </div>

          {/* Sub-Area Regions */}
          <div className="relative z-10 w-full flex h-full items-center">
            {/* Sub-Area 1: East */}
            <div className="w-[35%] h-full relative flex items-center px-2">
              <button
                onClick={() => onSelectSegment("SEG_012")}
                className={`w-full h-8 rounded-lg border text-left px-3 text-xs flex items-center justify-between transition-all ${
                  selectedSegment === "SEG_012"
                    ? "bg-sky-500/20 border-sky-400 text-sky-200"
                    : "bg-slate-900/80 border-slate-700/60 text-slate-400 hover:border-sky-500/40"
                }`}
              >
                <span className="font-semibold">Sub-Area 1 (East Approach)</span>
                <span className="font-mono text-[10px] text-slate-500">Km 0–35</span>
              </button>
            </div>

            {/* Boundary Crossover 35 */}
            <div className="w-3 h-8 flex items-center justify-center relative group">
              <div className="w-1 h-6 bg-sky-400 rounded-full cursor-pointer" />
              <div className="absolute -top-6 text-[9px] font-mono text-sky-400 whitespace-nowrap hidden group-hover:block bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                TP_35 Crossover
              </div>
            </div>

            {/* Sub-Area 2: Central Bottleneck (Segment 35) */}
            <div className="w-[35%] h-full relative flex items-center px-2">
              <button
                onClick={() => onSelectSegment("SEG_035")}
                className={`w-full h-8 rounded-lg border px-3 text-xs flex items-center justify-between transition-all font-semibold ${
                  isBottleneckGranted
                    ? "bg-emerald-950/40 border-emerald-500 text-emerald-300 pulse-granted"
                    : "bg-amber-950/40 border-amber-500 text-amber-300 pulse-bottleneck"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isBottleneckGranted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>Segment 35 Bottleneck (Km 34.0–35.0)</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className={isBottleneckGranted ? "text-emerald-400" : "text-amber-400"}>
                    {isBottleneckGranted ? "130 km/h (Restored)" : "PSR 30 km/h (Fracture)"}
                  </span>
                </div>
              </button>
            </div>

            {/* Boundary Interlock 70 */}
            <div className="w-3 h-8 flex items-center justify-center relative group">
              <div className="w-1 h-6 bg-sky-400 rounded-full cursor-pointer" />
              <div className="absolute -top-6 text-[9px] font-mono text-sky-400 whitespace-nowrap hidden group-hover:block bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                TP_70 Interlock
              </div>
            </div>

            {/* Sub-Area 3: West Terminal */}
            <div className="w-[30%] h-full relative flex items-center px-2">
              <button
                onClick={() => onSelectSegment("SEG_078")}
                className={`w-full h-8 rounded-lg border text-left px-3 text-xs flex items-center justify-between transition-all ${
                  selectedSegment === "SEG_078"
                    ? "bg-purple-500/20 border-purple-400 text-purple-200"
                    : "bg-slate-900/80 border-slate-700/60 text-slate-400 hover:border-purple-500/40"
                }`}
              >
                <span className="font-semibold">Sub-Area 3 (West Terminal)</span>
                <span className="font-mono text-[10px] text-slate-500">Km 70–100</span>
              </button>
            </div>
          </div>
        </div>

        {/* Milestone labels */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1 px-2">
          <span>Km 0.0 (Howrah End)</span>
          <span>Km 34.4 (Rail Fracture)</span>
          <span>Km 35.0 (Crossover)</span>
          <span>Km 70.0 (Interlocking)</span>
          <span>Km 100.0 (Kharagpur End)</span>
        </div>
      </div>
    </div>
  );
};

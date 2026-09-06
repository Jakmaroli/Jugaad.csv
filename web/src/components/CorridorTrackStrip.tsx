"use client";

import React from "react";
import {
  Navigation,
  AlertOctagon,
  CheckCircle2,
  MapPin,
  Train,
  ArrowRight,
  Info,
} from "lucide-react";

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
  // Key stations across 100km corridor
  const stations = [
    { name: "Kharagpur Jn", km: 0, code: "KGP", role: "Divisional HQ" },
    { name: "Midnapore", km: 12, code: "MDN", role: "Junction" },
    { name: "Godapiasal", km: 35, code: "GKL", role: "Bottleneck Crossover" },
    { name: "Salboni", km: 70, code: "SLB", role: "Block Post" },
    { name: "Chandrakona Rd", km: 100, code: "CDGR", role: "West Terminal" },
  ];

  return (
    <div className="rounded-2xl bg-[#0d1624] border border-slate-800/80 p-5 shadow-xl backdrop-blur-md">
      {/* Title Bar & Status Pill */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
              100 KM GEOGRAPHICAL CORRIDOR SCHEMATIC TRACK STRIP
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              Double Track (BG 1676mm)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click any segment or station below to focus the time-space possession matrix.
          </p>
        </div>

        {/* Speed & Restriction Status Badges */}
        <div className="flex items-center gap-2.5 text-xs flex-wrap font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Line Speed 130 km/h</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              isBottleneckGranted
                ? "bg-emerald-950/60 border-emerald-600 text-emerald-200"
                : "bg-amber-950/60 border-amber-500/80 text-amber-300 animate-pulse"
            }`}
          >
            {isBottleneckGranted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Km 34-36 Restored to 130 km/h</span>
              </>
            ) : (
              <>
                <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                <span>Active PSR 30 km/h at Km 34.8</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Railway Track Schematic Visualization */}
      <div className="relative pt-6 pb-4 px-2">
        {/* Station Markers Above Rails */}
        <div className="relative w-full h-8 mb-2 flex justify-between select-none">
          {stations.map((stn, idx) => {
            const leftPct = (stn.km / 100) * 100;
            return (
              <div
                key={stn.code}
                className="absolute flex flex-col items-center transform -translate-x-1/2"
                style={{ left: `${leftPct}%` }}
              >
                <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-slate-200 shadow-sm">
                  <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="font-bold">{stn.name}</span>
                  <span className="text-slate-400 hidden sm:inline">(Km {stn.km})</span>
                </div>
                <div className="w-[1px] h-3 bg-slate-600 mt-1" />
              </div>
            );
          })}
        </div>

        {/* Rails (Double Track) with Sleepers */}
        <div className="relative h-14 flex items-center bg-slate-950/80 rounded-xl border border-slate-800/80 px-2 overflow-hidden shadow-inner">
          {/* UP Line (Direction: Kharagpur -> West Terminal) */}
          <div className="absolute top-3.5 left-2 right-2 h-1 bg-slate-700 rounded-full" />
          <span className="absolute left-3 top-1 text-[8px] font-mono text-slate-500 uppercase tracking-wider">
            UP LINE &rarr;
          </span>

          {/* DOWN Line (Direction: West Terminal -> Kharagpur) */}
          <div className="absolute bottom-3.5 left-2 right-2 h-1 bg-slate-700 rounded-full" />
          <span className="absolute left-3 bottom-1 text-[8px] font-mono text-slate-500 uppercase tracking-wider">
            &larr; DOWN LINE
          </span>

          {/* Sleepers visual grid */}
          <div className="absolute inset-x-4 h-7 top-3.5 flex justify-between pointer-events-none opacity-25">
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} className="w-[1px] h-full bg-slate-400" />
            ))}
          </div>

          {/* 3 Clickable Sub-Areas Overlay */}
          <div className="relative z-10 w-full flex h-10 items-center gap-2">
            {/* Sub-Area 1: East Approach (Km 0 - 35) */}
            <div className="w-[35%] h-full">
              <button
                onClick={() => onSelectSegment("SEG_012")}
                className={`w-full h-full rounded-lg border px-3 text-xs flex items-center justify-between transition-all cursor-pointer ${
                  selectedSegment === "SEG_012"
                    ? "bg-sky-500/25 border-sky-400 text-sky-200 shadow-md shadow-sky-500/20"
                    : "bg-slate-900/85 border-slate-700/70 text-slate-400 hover:border-sky-500/50 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span className="font-semibold text-[11px] truncate">Sub-Area 1 (East Approach)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">Km 0–35</span>
              </button>
            </div>

            {/* Boundary Interlock Marker */}
            <div className="w-2 flex justify-center text-sky-400 text-xs font-mono select-none">|</div>

            {/* Sub-Area 2: Central Bottleneck (Segment 35, Km 35 - 70) */}
            <div className="w-[35%] h-full">
              <button
                onClick={() => onSelectSegment("SEG_035")}
                className={`w-full h-full rounded-lg border px-3 text-xs flex items-center justify-between transition-all cursor-pointer font-semibold ${
                  selectedSegment === "SEG_035"
                    ? isBottleneckGranted
                      ? "bg-emerald-950/70 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/30"
                      : "bg-amber-950/70 border-amber-400 text-amber-200 ring-2 ring-amber-500/40"
                    : isBottleneckGranted
                    ? "bg-emerald-950/30 border-emerald-600/50 text-emerald-300"
                    : "bg-amber-950/30 border-amber-600/50 text-amber-300"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isBottleneckGranted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertOctagon className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                  )}
                  <span className="text-[11px] truncate">
                    Segment 35 Bottleneck (Godapiasal)
                  </span>
                </div>
                <span className="font-mono text-[10px] text-amber-300 font-bold ml-1">
                  Km 34–36
                </span>
              </button>
            </div>

            {/* Boundary Interlock Marker */}
            <div className="w-2 flex justify-center text-sky-400 text-xs font-mono select-none">|</div>

            {/* Sub-Area 3: West Terminal (Km 70 - 100) */}
            <div className="w-[30%] h-full">
              <button
                onClick={() => onSelectSegment("SEG_078")}
                className={`w-full h-full rounded-lg border px-3 text-xs flex items-center justify-between transition-all cursor-pointer ${
                  selectedSegment === "SEG_078"
                    ? "bg-purple-500/25 border-purple-400 text-purple-200 shadow-md shadow-purple-500/20"
                    : "bg-slate-900/85 border-slate-700/70 text-slate-400 hover:border-purple-500/50 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="font-semibold text-[11px] truncate">Sub-Area 3 (West Terminal)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">Km 70–100</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

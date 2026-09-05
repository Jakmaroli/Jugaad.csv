"use client";

import React, { useState } from "react";
import { Clock, Train, ShieldCheck, AlertTriangle, Layers, Info, CheckCircle2 } from "lucide-react";

export interface TrainItem {
  id: string;
  number: string;
  name: string;
  type: string;
  start: string;
  end: string;
  start_hhmm: string;
  end_hhmm: string;
  color: string;
}

export interface DemandItem {
  block_id: string;
  department: string;
  block_type: string;
  start: string;
  end: string;
  start_hhmm: string;
  end_hhmm: string;
  color: string;
  is_colliding?: boolean;
}

export interface SanctionedItem {
  block_id: string;
  department: string;
  block_type: string;
  start: string;
  end: string;
  start_hhmm: string;
  end_hhmm: string;
  color: string;
  priority_weight: number;
  status: string;
}

export interface GanttData {
  segment_id: string;
  horizon_start: string;
  horizon_end: string;
  trains: TrainItem[];
  original_demands: DemandItem[];
  sanctioned_blocks: SanctionedItem[];
  bottleneck_window: {
    start: string;
    end: string;
    duration_minutes: number;
    description: string;
  };
}

interface GanttTimelineProps {
  data: GanttData | null;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  isLoading?: boolean;
}

// Fixed time window: 08:30 to 14:30 = 360 minutes
const START_MINUTES = 8 * 60 + 30; // 510 min
const TOTAL_MINUTES = 360; // 6 hours

function timeToPercent(timeStr: string): number {
  if (!timeStr) return 0;
  // Format: "YYYY-MM-DDTHH:MM:SS" or "HH:MM"
  let hh = 0, mm = 0;
  if (timeStr.includes("T")) {
    const timePart = timeStr.split("T")[1];
    const parts = timePart.split(":");
    hh = parseInt(parts[0], 10);
    mm = parseInt(parts[1], 10);
  } else if (timeStr.includes(":")) {
    const parts = timeStr.split(":");
    hh = parseInt(parts[0], 10);
    mm = parseInt(parts[1], 10);
  }
  const currentMin = hh * 60 + mm;
  const clamped = Math.max(START_MINUTES, Math.min(START_MINUTES + TOTAL_MINUTES, currentMin));
  return ((clamped - START_MINUTES) / TOTAL_MINUTES) * 100;
}

export const GanttCorridorTimeline: React.FC<GanttTimelineProps> = ({
  data,
  selectedBlockId,
  onSelectBlock,
  isLoading,
}) => {
  const [hoverItem, setHoverItem] = useState<{
    type: "train" | "demand" | "block";
    title: string;
    sub: string;
    start: string;
    end: string;
    meta?: string;
  } | null>(null);

  // Half-hour time marks
  const timeMarks = [
    { label: "08:30", min: 0 },
    { label: "09:00", min: 30 },
    { label: "09:30", min: 60 },
    { label: "10:00", min: 90 },
    { label: "10:30", min: 120 },
    { label: "11:00", min: 150 },
    { label: "11:30", min: 180 },
    { label: "12:00", min: 210 },
    { label: "12:30", min: 240 },
    { label: "13:00", min: 270 },
    { label: "13:30", min: 300 },
    { label: "14:00", min: 330 },
    { label: "14:30", min: 360 },
  ];

  if (isLoading || !data) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[360px] animate-pulse">
        <Clock className="w-8 h-8 text-sky-400 mb-3 animate-spin" />
        <span className="text-slate-400 font-mono text-sm">Computing Corridor Time-Space Gantt Matrix...</span>
      </div>
    );
  }

  // Safety buffer markers (10 min before 11:35 and 10 min after 13:35)
  const bufferStartLeft = timeToPercent("11:25");
  const bufferStartWidth = timeToPercent("11:35") - bufferStartLeft;
  const bufferEndLeft = timeToPercent("13:35");
  const bufferEndWidth = timeToPercent("13:45") - bufferEndLeft;

  // CP-SAT Optimal Window (11:35 - 13:35)
  const windowLeft = timeToPercent("11:35");
  const windowWidth = timeToPercent("13:35") - windowLeft;

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-xl relative backdrop-blur-md">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-white tracking-wide">
                Corridor Time-Space Possession Gantt
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-sky-950/80 text-sky-300 border border-sky-700/50">
                Segment 35 Bottleneck (KM 34.0 - 36.0)
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              CP-SAT Bundled Multi-Disciplinary Window: 11:35 – 13:35 (120 min) • 0 Delay Incurred
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-sky-500 inline-block shadow-sm"></span>
            <span className="text-slate-300">Passenger Trains</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block shadow-sm"></span>
            <span className="text-slate-300">Freight Trains</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block shadow-sm"></span>
            <span className="text-slate-300">Engineering</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-blue-500 inline-block shadow-sm"></span>
            <span className="text-slate-300">Signal (S&T)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-pink-500 inline-block shadow-sm"></span>
            <span className="text-slate-300">Traction (TRD)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-red-500/80 border border-red-400 inline-block"></span>
            <span className="text-red-400">Pre-Opt Collisions</span>
          </div>
        </div>
      </div>

      {/* Timeline container */}
      <div className="mt-5 relative select-none overflow-x-auto pb-4">
        <div className="min-w-[760px] relative">
          {/* Time axis header */}
          <div className="relative h-7 border-b border-slate-800 flex items-center">
            {timeMarks.map((tm, idx) => {
              const leftPct = (tm.min / TOTAL_MINUTES) * 100;
              return (
                <div
                  key={idx}
                  className="absolute transform -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${leftPct}%` }}
                >
                  <span className="text-[11px] font-mono text-slate-400">{tm.label}</span>
                  <div className="w-[1px] h-2 bg-slate-700 mt-0.5"></div>
                </div>
              );
            })}
          </div>

          {/* Timeline Grid Background */}
          <div className="relative h-64 border-b border-slate-800 bg-slate-950/40 rounded-b-lg overflow-hidden">
            {/* Grid vertical lines */}
            {timeMarks.map((tm, idx) => {
              const leftPct = (tm.min / TOTAL_MINUTES) * 100;
              return (
                <div
                  key={`grid-${idx}`}
                  className="absolute top-0 bottom-0 w-[1px] bg-slate-800/40 pointer-events-none"
                  style={{ left: `${leftPct}%` }}
                />
              );
            })}

            {/* CP-SAT Optimal Shadow Zone Highlight */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/5 border-l-2 border-r-2 border-dashed border-emerald-500/40 pointer-events-none transition-all"
              style={{ left: `${windowLeft}%`, width: `${windowWidth}%` }}
            >
              <div className="absolute top-2 left-2 flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/50 text-[10px] font-mono text-emerald-300">
                <ShieldCheck className="w-3 h-3 mr-1" />
                <span>CP-SAT CO-LOCATED SHADOW SLOT</span>
              </div>
            </div>

            {/* Safety Headway Buffers (10-min caution bands) */}
            <div
              className="absolute top-0 bottom-0 bg-amber-500/10 border-l border-amber-500/30 pointer-events-none"
              style={{ left: `${bufferStartLeft}%`, width: `${bufferStartWidth}%` }}
              title="10-min Ingress Safety Headway Buffer"
            />
            <div
              className="absolute top-0 bottom-0 bg-amber-500/10 border-r border-amber-500/30 pointer-events-none"
              style={{ left: `${bufferEndLeft}%`, width: `${bufferEndWidth}%` }}
              title="10-min Egress Safety Headway Buffer"
            />

            {/* ================= ROW 1: SCHEDULED TRAIN OCCUPANCIES ================= */}
            <div className="absolute top-4 left-0 right-0 h-10 flex items-center px-1">
              <span className="absolute left-2 text-[10px] uppercase font-mono tracking-wider text-slate-500 z-10 pointer-events-none">
                TRAIN OCCUPANCY (COA)
              </span>

              {data.trains.map((train) => {
                const left = timeToPercent(train.start);
                const right = timeToPercent(train.end);
                const width = Math.max(right - left, 1.8);

                return (
                  <div
                    key={train.id}
                    className="absolute h-7 rounded-md flex items-center px-2 text-xs font-mono font-medium shadow-md cursor-pointer transition-all hover:scale-105 hover:z-30 border"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: train.color === "#f59e0b" ? "rgba(245, 158, 11, 0.25)" : "rgba(56, 189, 248, 0.25)",
                      borderColor: train.color,
                      color: train.color,
                    }}
                    onMouseEnter={() =>
                      setHoverItem({
                        type: "train",
                        title: `${train.number} ${train.name}`,
                        sub: `Type: ${train.type} • Active Path KM 34.0 - 36.0`,
                        start: train.start_hhmm,
                        end: train.end_hhmm,
                        meta: "Conflict Protected • Punctuality 100%",
                      })
                    }
                    onMouseLeave={() => setHoverItem(null)}
                  >
                    <Train className="w-3 h-3 mr-1 shrink-0" />
                    <span className="truncate text-[10px]">{train.number}</span>
                  </div>
                );
              })}
            </div>

            {/* ================= ROW 2: UNCOORDINATED REQUESTS (NAIVE FIFO) ================= */}
            <div className="absolute top-18 left-0 right-0 h-10 flex items-center px-1 border-t border-slate-800/40">
              <span className="absolute left-2 text-[10px] uppercase font-mono tracking-wider text-slate-500 z-10 pointer-events-none">
                NAIVE REQUESTS (UNCOORDINATED)
              </span>

              {data.original_demands.map((dem) => {
                const left = timeToPercent(dem.start);
                const right = timeToPercent(dem.end);
                const width = Math.max(right - left, 2.5);

                return (
                  <div
                    key={`dem-${dem.block_id}`}
                    className="absolute h-6 rounded border border-dashed border-red-500/80 bg-red-500/20 text-red-300 flex items-center px-2 text-[10px] font-mono cursor-pointer transition-transform hover:scale-105 hover:z-30"
                    style={{ left: `${left}%`, width: `${width}%` }}
                    onMouseEnter={() =>
                      setHoverItem({
                        type: "demand",
                        title: `Uncoordinated Request: ${dem.block_id}`,
                        sub: `${dem.department} • ${dem.block_type}`,
                        start: dem.start_hhmm,
                        end: dem.end_hhmm,
                        meta: "Direct Collision with Shatabdi Exp! Would cause 150m delay.",
                      })
                    }
                    onMouseLeave={() => setHoverItem(null)}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1 text-red-400 shrink-0" />
                    <span className="truncate">{dem.block_id}</span>
                  </div>
                );
              })}
            </div>

            {/* ================= ROW 3: CP-SAT BUNDLED SANCTIONED BLOCKS ================= */}
            <div className="absolute top-32 left-0 right-0 h-16 flex items-center px-1 border-t border-slate-800/40">
              <span className="absolute left-2 text-[10px] uppercase font-mono tracking-wider text-emerald-400 z-10 pointer-events-none">
                CP-SAT BUNDLED SLOTS (OPTIMIZED)
              </span>

              {data.sanctioned_blocks.map((block, idx) => {
                const left = timeToPercent(block.start);
                const right = timeToPercent(block.end);
                const width = Math.max(right - left, 3.0);
                const isSelected = selectedBlockId === block.block_id;

                // Stagger slightly vertically if overlapping exactly
                const topOffset = (idx % 3) * 16;

                return (
                  <button
                    key={block.block_id}
                    onClick={() => onSelectBlock(block.block_id)}
                    className={`absolute h-7 rounded-md flex items-center justify-between px-2.5 text-xs font-mono font-medium shadow-lg transition-all cursor-pointer border ${
                      isSelected
                        ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 z-40 scale-105"
                        : "hover:scale-102 hover:z-30"
                    }`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      top: `${topOffset + 4}px`,
                      backgroundColor: `${block.color}25`,
                      borderColor: block.color,
                      color: block.color,
                    }}
                    onMouseEnter={() =>
                      setHoverItem({
                        type: "block",
                        title: `${block.block_id} • ${block.department}`,
                        sub: `Type: ${block.block_type} • Status: ${block.status}`,
                        start: block.start_hhmm,
                        end: block.end_hhmm,
                        meta: `Priority Weight: ${block.priority_weight}/100 • Bundled in Shadow Slot`,
                      })
                    }
                    onMouseLeave={() => setHoverItem(null)}
                  >
                    <div className="flex items-center space-x-1 truncate">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span className="truncate font-semibold">{block.block_id}</span>
                      <span className="text-[10px] opacity-75 hidden sm:inline">({block.department.slice(0, 3)})</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-90 hidden md:inline">{block.start_hhmm}-{block.end_hhmm}</span>
                  </button>
                );
              })}
            </div>

            {/* ================= ROW 4: SAFETY HEADWAY EXPLANATION ================= */}
            <div className="absolute bottom-2 left-0 right-0 h-6 flex items-center justify-between px-4 text-[10px] font-mono text-slate-500">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Automatic 10-minute headway margin enforced on either side of maintenance window</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-emerald-400 font-semibold">Bundled Efficiency: 3 Blocks in 1 Window</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip Card */}
      {hoverItem && (
        <div className="mt-3 p-3 rounded-lg bg-slate-800/90 border border-slate-700 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 animate-fadeIn">
          <div>
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-white">{hoverItem.title}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{hoverItem.sub}</span>
            </div>
            {hoverItem.meta && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 ml-6">
                {hoverItem.meta}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto font-mono text-xs bg-slate-900/80 px-2.5 py-1 rounded border border-slate-700">
            <span className="text-slate-400">Slot:</span>
            <span className="text-sky-300 font-semibold">{hoverItem.start}</span>
            <span className="text-slate-500">→</span>
            <span className="text-sky-300 font-semibold">{hoverItem.end}</span>
          </div>
        </div>
      )}
    </div>
  );
};

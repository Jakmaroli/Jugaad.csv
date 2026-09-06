"use client";

import React, { useState } from "react";
import {
  Clock,
  Train,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Info,
  CheckCircle2,
  Sparkles,
  MousePointerClick,
} from "lucide-react";

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
  let hh = 0,
    mm = 0;
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
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[380px] animate-pulse">
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
    <div className="bg-slate-900/95 border border-slate-800/80 rounded-2xl p-5 shadow-2xl relative backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                CORRIDOR TIME-SPACE POSSESSION MATRIX
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-sky-950/80 text-sky-300 border border-sky-700/50">
                Segment 35 Bottleneck (Km 34.0–36.0)
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">
                CP-SAT Co-located Window: 11:35 – 13:35 (120 min)
              </span>
              <span>•</span>
              <span className="text-slate-300">0 Delay Incurred</span>
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-sky-400 inline-block shadow-sm"></span>
            <span className="text-slate-300">Passenger Trains</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block shadow-sm"></span>
            <span className="text-slate-300">Freight Trains</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block shadow-sm"></span>
            <span className="text-slate-300">Civil Eng</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-400 inline-block shadow-sm"></span>
            <span className="text-slate-300">Signal S&T</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-pink-400 inline-block shadow-sm"></span>
            <span className="text-slate-300">Traction TRD</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500 border border-rose-400 inline-block"></span>
            <span className="text-rose-400 font-semibold">Naive Collisions</span>
          </div>
        </div>
      </div>

      {/* Timeline container with horizontal scroll support */}
      <div className="mt-4 relative select-none overflow-x-auto pb-2">
        <div className="min-w-[820px] relative">
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
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">{tm.label}</span>
                  <div className="w-[1px] h-2 bg-slate-700 mt-0.5"></div>
                </div>
              );
            })}
          </div>

          {/* Timeline Grid Background */}
          <div className="relative h-64 border-b border-slate-800 bg-slate-950/60 rounded-b-xl overflow-hidden">
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
              className="absolute top-0 bottom-0 bg-emerald-500/10 border-l-2 border-r-2 border-dashed border-emerald-500/50 pointer-events-none transition-all"
              style={{ left: `${windowLeft}%`, width: `${windowWidth}%` }}
            >
              <div className="absolute top-2 left-2 flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/60 text-[10px] font-mono text-emerald-300 shadow">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                <span className="font-bold">CP-SAT CO-LOCATED SHADOW SLOT</span>
              </div>
            </div>

            {/* Safety Headway Buffers (10-min caution bands) */}
            <div
              className="absolute top-0 bottom-0 bg-amber-500/15 border-l border-amber-500/40 pointer-events-none"
              style={{ left: `${bufferStartLeft}%`, width: `${bufferStartWidth}%` }}
              title="10-min Ingress Safety Headway Buffer"
            />
            <div
              className="absolute top-0 bottom-0 bg-amber-500/15 border-r border-amber-500/40 pointer-events-none"
              style={{ left: `${bufferEndLeft}%`, width: `${bufferEndWidth}%` }}
              title="10-min Egress Safety Headway Buffer"
            />

            {/* ================= ROW 1: SCHEDULED TRAIN OCCUPANCIES ================= */}
            <div className="absolute top-4 left-0 right-0 h-10 flex items-center px-1">
              <span className="absolute left-2 text-[9px] uppercase font-mono tracking-wider text-slate-500 z-10 pointer-events-none font-bold">
                TRAIN OCCUPANCIES (COA)
              </span>

              {data.trains.map((train) => {
                const left = timeToPercent(train.start);
                const right = timeToPercent(train.end);
                const width = Math.max(right - left, 2.0);

                return (
                  <div
                    key={train.id}
                    className="absolute h-7 rounded-lg flex items-center px-2 text-xs font-mono font-medium shadow-md cursor-pointer transition-all hover:scale-105 hover:z-30 border"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor:
                        train.color === "#f59e0b"
                          ? "rgba(245, 158, 11, 0.25)"
                          : "rgba(56, 189, 248, 0.25)",
                      borderColor: train.color,
                      color: train.color,
                    }}
                    onMouseEnter={() =>
                      setHoverItem({
                        type: "train",
                        title: `${train.number} ${train.name}`,
                        sub: `Type: ${train.type} • Active Path Km 34.0 - 36.0`,
                        start: train.start_hhmm,
                        end: train.end_hhmm,
                        meta: "Conflict Protected • Headway Guaranteed",
                      })
                    }
                    onMouseLeave={() => setHoverItem(null)}
                  >
                    <Train className="w-3 h-3 mr-1 shrink-0" />
                    <span className="truncate text-[10px] font-bold">{train.number}</span>
                  </div>
                );
              })}
            </div>

            {/* ================= ROW 2: UNCOORDINATED REQUESTS (NAIVE FIFO) ================= */}
            <div className="absolute top-18 left-0 right-0 h-10 flex items-center px-1 border-t border-slate-800/40">
              <span className="absolute left-2 text-[9px] uppercase font-mono tracking-wider text-rose-400/90 z-10 pointer-events-none font-bold">
                NAIVE UNCOORDINATED DEMANDS
              </span>

              {data.original_demands.map((dem) => {
                const left = timeToPercent(dem.start);
                const right = timeToPercent(dem.end);
                const width = Math.max(right - left, 2.8);
                const isSelected = selectedBlockId === dem.block_id;

                return (
                  <button
                    key={`dem-${dem.block_id}`}
                    onClick={() => onSelectBlock(dem.block_id)}
                    className={`absolute h-6 rounded-md border border-dashed border-rose-500 bg-rose-500/20 text-rose-300 flex items-center px-2 text-[10px] font-mono cursor-pointer transition-all hover:scale-105 hover:z-30 ${
                      isSelected ? "ring-2 ring-rose-400 scale-105 z-30" : ""
                    }`}
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
                    <AlertTriangle className="w-3 h-3 mr-1 text-rose-400 shrink-0" />
                    <span className="truncate font-semibold">{dem.block_id}</span>
                  </button>
                );
              })}
            </div>

            {/* ================= ROW 3: CP-SAT BUNDLED SANCTIONED BLOCKS ================= */}
            <div className="absolute top-32 left-0 right-0 h-16 flex items-center px-1 border-t border-slate-800/40">
              <span className="absolute left-2 text-[9px] uppercase font-mono tracking-wider text-emerald-400 z-10 pointer-events-none font-bold">
                CP-SAT CO-LOCATED BUNDLED WINDOW
              </span>

              {data.sanctioned_blocks.map((block, idx) => {
                const left = timeToPercent(block.start);
                const right = timeToPercent(block.end);
                const width = Math.max(right - left, 3.2);
                const isSelected = selectedBlockId === block.block_id;
                const topOffset = (idx % 3) * 16;

                return (
                  <button
                    key={block.block_id}
                    onClick={() => onSelectBlock(block.block_id)}
                    className={`absolute h-7 rounded-lg flex items-center justify-between px-2.5 text-xs font-mono font-medium shadow-lg transition-all cursor-pointer border ${
                      isSelected
                        ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 z-40 scale-105 shadow-amber-500/20"
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
                        meta: `Priority Weight: ${block.priority_weight}/100 • Co-located in Shadow Window`,
                      })
                    }
                    onMouseLeave={() => setHoverItem(null)}
                  >
                    <div className="flex items-center space-x-1 truncate">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span className="truncate font-bold">{block.block_id}</span>
                      <span className="text-[10px] opacity-80 hidden sm:inline">
                        ({block.department.slice(0, 3)})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono opacity-90 hidden md:inline font-bold">
                      {block.start_hhmm}-{block.end_hhmm}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom footnote */}
            <div className="absolute bottom-2 left-0 right-0 h-6 flex items-center justify-between px-4 text-[10px] font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Automatic 10-minute headway margin enforced on either side of maintenance window</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-emerald-400 font-bold">Bundled Efficiency: 3 Blocks in 1 Window</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip / Focus Card */}
      {hoverItem ? (
        <div className="mt-3 p-3 rounded-xl bg-slate-800/90 border border-slate-700 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 animate-fadeIn">
          <div>
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-bold text-white">{hoverItem.title}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{hoverItem.sub}</span>
            </div>
            {hoverItem.meta && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 ml-6">
                {hoverItem.meta}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 shrink-0 font-mono text-xs bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400">Time:</span>
            <span className="text-sky-300 font-bold">{hoverItem.start}</span>
            <span className="text-slate-500">→</span>
            <span className="text-sky-300 font-bold">{hoverItem.end}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 px-3 py-2 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5 text-sky-400" />
            <span>Click any block on the Gantt to inspect safety scores, simulate reschedule shifts, or issue statutory Private Numbers (PN).</span>
          </div>
          <span className="text-slate-500 hidden sm:inline">Active Segment: {data.segment_id}</span>
        </div>
      )}
    </div>
  );
};

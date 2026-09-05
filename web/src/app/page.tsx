"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "../components/Header";
import { KPICards } from "../components/KPICards";
import { CorridorTrackStrip } from "../components/CorridorTrackStrip";
import { GanttCorridorTimeline, GanttData } from "../components/GanttCorridorTimeline";
import {
  ControllerActionSidebar,
  BlockDetail,
} from "../components/ControllerActionSidebar";
import { AnalysisTabs } from "../components/AnalysisTabs";
import { fetchBlocks, fetchGantt, fetchKPIs } from "../lib/api";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const [selectedSegment, setSelectedSegment] = useState<string>("SEG_035");
  const [selectedBlockId, setSelectedBlockId] = useState<string>("BLK_001");
  const [blocks, setBlocks] = useState<BlockDetail[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [ganttData, setGanttData] = useState<GanttData | null>(null);

  const [isLoadingBlocks, setIsLoadingBlocks] = useState<boolean>(true);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState<boolean>(true);
  const [isLoadingGantt, setIsLoadingGantt] = useState<boolean>(true);
  const [apiOnline, setApiOnline] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  // Trigger full data refresh
  const handleRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
  }, []);

  // Fetch KPIs
  useEffect(() => {
    let isMounted = true;
    setIsLoadingKPIs(true);
    fetchKPIs()
      .then((data) => {
        if (isMounted) {
          setKpis(data);
          setApiOnline(true);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to load KPIs:", err);
          setApiOnline(false);
          setApiError(err.message || "Failed to connect to Indian Railways Planning API");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingKPIs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshCounter]);

  // Fetch all corridor blocks
  useEffect(() => {
    let isMounted = true;
    setIsLoadingBlocks(true);

    fetchBlocks()
      .then((data) => {
        if (isMounted) {
          setBlocks(data);
          // Default selection to high-priority block on Segment 35 if available
          if (data && data.length > 0) {
            const seg35Block = data.find(
              (b: BlockDetail) => b.segment_id === "SEG_035" || b.block_id === "BLK_001"
            );
            if (seg35Block && (!selectedBlockId || selectedBlockId === "BLK_001")) {
              setSelectedBlockId(seg35Block.block_id);
            }
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to load blocks:", err);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingBlocks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshCounter]);

  // Fetch Gantt timeline data for currently selected segment
  useEffect(() => {
    let isMounted = true;
    setIsLoadingGantt(true);

    fetchGantt(selectedSegment)
      .then((data) => {
        if (isMounted) {
          setGanttData(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(`Failed to load Gantt for ${selectedSegment}:`, err);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingGantt(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSegment, refreshCounter]);

  // Active selected block object
  const activeBlock =
    blocks.find((b) => b.block_id === selectedBlockId) || (blocks.length > 0 ? blocks[0] : null);

  // Check if bottleneck blocks have been sanctioned
  const isBottleneckGranted = blocks.some(
    (b) =>
      b.segment_id === "SEG_035" &&
      (b.status === "Approved" || b.status === "Granted")
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Header Bar */}
      <Header apiOnline={apiOnline} onRefresh={handleRefresh} />

      {/* Main Cockpit Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* API Error Alert banner */}
        {apiError && !apiOnline && (
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-600/80 text-red-200 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Backend Connection Alert: </span>
                <span>{apiError} (Ensure FastAPI backend is running on http://127.0.0.1:8000)</span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-white text-xs font-mono transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Dynamic KPI Headline Cards */}
        <KPICards kpis={kpis} loading={isLoadingKPIs} />

        {/* 100km Geographic Corridor Track Strip */}
        <CorridorTrackStrip
          selectedSegment={selectedSegment}
          onSelectSegment={(seg) => setSelectedSegment(seg)}
          isBottleneckGranted={isBottleneckGranted}
        />

        {/* Workspace Dual-Pane Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Gantt Timeline & Multi-Analysis Tabs (8 cols on XL) */}
          <div className="xl:col-span-8 space-y-6">
            {/* Time-Space Gantt Possession Matrix */}
            <GanttCorridorTimeline
              data={ganttData}
              selectedBlockId={selectedBlockId}
              onSelectBlock={(bId) => setSelectedBlockId(bId)}
              isLoading={isLoadingGantt}
            />

            {/* In-depth Analytics & Audit Trail Tabs */}
            <AnalysisTabs
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={(bId) => setSelectedBlockId(bId)}
              refreshTrigger={refreshCounter}
            />
          </div>

          {/* Right Column: Controller Action Cockpit & Local XAI (4 cols on XL) */}
          <div className="xl:col-span-4 sticky top-6">
            <ControllerActionSidebar
              selectedBlock={activeBlock}
              allBlocks={blocks}
              onSelectBlock={(bId) => setSelectedBlockId(bId)}
              onActionSuccess={handleRefresh}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs font-mono text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-[1720px] mx-auto gap-2">
          <div>
            Smart India Hackathon 2024 (SIH26027) • Ministry of Railways Decision Support System
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>Next.js 16 (React 19) + FastAPI</span>
            <span>•</span>
            <span className="text-emerald-400">Production Operational Mode</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

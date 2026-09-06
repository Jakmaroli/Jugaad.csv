"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "../components/Header";
import { KPICards } from "../components/KPICards";
import { ExecutiveStoryTab } from "../components/ExecutiveStoryTab";
import { CorridorTrackStrip } from "../components/CorridorTrackStrip";
import { GanttCorridorTimeline, GanttData } from "../components/GanttCorridorTimeline";
import {
  ControllerActionSidebar,
  BlockDetail,
} from "../components/ControllerActionSidebar";
import { AnalysisTabs } from "../components/AnalysisTabs";
import { GuidedTourBanner } from "../components/GuidedTourBanner";
import { fetchBlocks, fetchGantt, fetchKPIs } from "../lib/api";
import { RefreshCw, Sparkles, Sliders, CheckCircle2, ShieldCheck, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState<string>("operations");
  const [selectedSegment, setSelectedSegment] = useState<string>("SEG_035");
  const [selectedBlockId, setSelectedBlockId] = useState<string>("BLK_001");
  const [blocks, setBlocks] = useState<BlockDetail[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [ganttData, setGanttData] = useState<GanttData | null>(null);

  const [isLoadingBlocks, setIsLoadingBlocks] = useState<boolean>(true);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState<boolean>(true);
  const [isLoadingGantt, setIsLoadingGantt] = useState<boolean>(true);
  const [apiOnline, setApiOnline] = useState<boolean>(true);

  // Guided Walkthrough Tour State
  const [isTourOpen, setIsTourOpen] = useState<boolean>(true);
  const [tourStep, setTourStep] = useState<number>(1);

  // Inspector visibility toggle (for responsive focus)
  const [showInspector, setShowInspector] = useState<boolean>(true);

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
          console.warn("KPIs fallback active:", err);
          setApiOnline(false);
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
          if (data && data.length > 0 && (!selectedBlockId || selectedBlockId === "BLK_001")) {
            const seg35Block = data.find(
              (b: BlockDetail) => b.segment_id === "SEG_035" || b.block_id === "BLK_001"
            );
            if (seg35Block) {
              setSelectedBlockId(seg35Block.block_id);
            }
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("Blocks fallback active:", err);
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
          console.warn(`Gantt fallback active for ${selectedSegment}:`, err);
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

  // Guided tour step activator
  const handleSelectTourStep = (step: number) => {
    setTourStep(step);
    setActiveNav("operations");

    if (step === 1) {
      setSelectedSegment("SEG_035");
      setSelectedBlockId("BLK_001");
      setShowInspector(true);
    } else if (step === 2) {
      setSelectedSegment("SEG_035");
      setSelectedBlockId("BLK_001");
      setShowInspector(true);
    } else if (step === 3) {
      setSelectedSegment("SEG_035");
      setSelectedBlockId("BLK_001");
      setShowInspector(true);
    } else if (step === 4) {
      setSelectedSegment("SEG_035");
      setSelectedBlockId("BLK_001");
      setShowInspector(true);
    }
  };

  const handleResetDemo = () => {
    setSelectedSegment("SEG_035");
    setSelectedBlockId("BLK_001");
    setTourStep(1);
    handleRefresh();
  };

  return (
    <div className="min-h-screen bg-[#060d17] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Header Bar with Streamlined Navigation & Tour Toggle */}
      <Header
        apiOnline={apiOnline}
        onRefresh={handleRefresh}
        activeNav={activeNav}
        onChangeNav={(nav) => setActiveNav(nav)}
        isTourOpen={isTourOpen}
        onToggleTour={() => setIsTourOpen(!isTourOpen)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Guided Walkthrough Stepper Banner */}
        {isTourOpen && (
          <GuidedTourBanner
            currentStep={tourStep}
            onSelectStep={handleSelectTourStep}
            onResetDemo={handleResetDemo}
          />
        )}

        {/* Dynamic KPI Headline Cards */}
        <KPICards kpis={kpis} loading={isLoadingKPIs} />

        {/* ================= VIEW 1: UNIFIED CORRIDOR OPERATIONS COCKPIT (DEFAULT) ================= */}
        {(activeNav === "operations" || activeNav === "schedule" || activeNav === "actions") && (
          <div className="space-y-6 animate-fadeIn">
            {/* 100km Geographic Corridor Track Strip */}
            <CorridorTrackStrip
              selectedSegment={selectedSegment}
              onSelectSegment={(seg) => setSelectedSegment(seg)}
              isBottleneckGranted={isBottleneckGranted}
            />

            {/* Split Screen Workspace: Gantt Matrix + Decision Console Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Canvas: Time-Space Gantt Matrix (approx 68% width on desktop) */}
              <div className={`${showInspector ? "lg:col-span-8" : "lg:col-span-12"} space-y-4 transition-all duration-300`}>
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs font-mono text-slate-400">
                    Active Corridor Segment: <span className="text-sky-300 font-bold">{selectedSegment}</span> •
                    Timeline Horizon: <span className="text-slate-200">08:30 – 14:30</span>
                  </div>
                  {!showInspector && (
                    <button
                      onClick={() => setShowInspector(true)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Open Decision Console</span>
                    </button>
                  )}
                </div>

                <GanttCorridorTimeline
                  data={ganttData}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={(bId) => {
                    setSelectedBlockId(bId);
                    setShowInspector(true);
                  }}
                  isLoading={isLoadingGantt}
                />
              </div>

              {/* Right Canvas: Section Controller Decision Console (approx 32% width on desktop) */}
              {showInspector && (
                <div className="lg:col-span-4 space-y-4 animate-fadeIn">
                  <ControllerActionSidebar
                    selectedBlock={activeBlock}
                    allBlocks={blocks}
                    onSelectBlock={(bId) => setSelectedBlockId(bId)}
                    onActionSuccess={handleRefresh}
                    onClose={() => setShowInspector(false)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW 2: EXECUTIVE STORY & IMPACT ================= */}
        {activeNav === "story" && (
          <ExecutiveStoryTab
            onNavigateToSchedule={() => setActiveNav("operations")}
            onNavigateToActions={() => {
              setActiveNav("operations");
              setShowInspector(true);
            }}
            kpis={kpis}
          />
        )}

        {/* ================= VIEW 3: DEEP ALGORITHMIC ANALYTICS ================= */}
        {activeNav === "analytics" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span>Deep Algorithmic Proofs, Pareto Trade-offs & Statutory Compliance</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Multi-objective Pareto frontier curves, predictive asset degradation (RUL), machine leveling, and immutable Section Controller audit trail.
              </p>
            </div>

            <AnalysisTabs
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={(bId) => {
                setSelectedBlockId(bId);
                setActiveNav("operations");
                setShowInspector(true);
              }}
              refreshTrigger={refreshCounter}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#040810] py-4 px-6 text-center text-xs font-mono text-slate-500 mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-[1720px] mx-auto gap-2">
          <div>
            Smart India Hackathon 2024 (SIH26027) • Ministry of Railways AI-Assisted Decision Support System
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>Next.js 16 + FastAPI</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">SER Kharagpur Section</span>
            <span>•</span>
            <span className="text-sky-400 font-semibold">Human-in-the-Loop Cockpit</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

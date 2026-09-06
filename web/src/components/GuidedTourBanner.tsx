"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Cpu,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCcw,
} from "lucide-react";

interface GuidedTourBannerProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  onResetDemo: () => void;
}

export const GuidedTourBanner: React.FC<GuidedTourBannerProps> = ({
  currentStep,
  onSelectStep,
  onResetDemo,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const steps = [
    {
      id: 1,
      title: "1. The Collision Problem",
      subtitle: "3 Depts Demand Segment 35",
      badge: "Bottleneck Km 34-36",
      icon: AlertTriangle,
      color: "from-rose-500/20 to-red-500/10 border-rose-500/40 text-rose-300",
      activeBorder: "border-rose-400 ring-2 ring-rose-500/40",
      description:
        "Civil, Signal, and Traction independently demanded overlapping closures colliding with Shatabdi Express.",
    },
    {
      id: 2,
      title: "2. CP-SAT Shadow Bundling",
      subtitle: "120m Co-located Slot",
      badge: "150m Corridor Saved",
      icon: Cpu,
      color: "from-sky-500/20 to-blue-500/10 border-sky-500/40 text-sky-300",
      activeBorder: "border-sky-400 ring-2 ring-sky-500/40",
      description:
        "Constraint Programming harmonizes demands into one shared window (11:35–13:35) with 10-min safety buffer.",
    },
    {
      id: 3,
      title: "3. Controller Sanction",
      subtitle: "Human Sign-off + Mint PN",
      badge: "Statutory PN-035",
      icon: ShieldCheck,
      color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300",
      activeBorder: "border-emerald-400 ring-2 ring-emerald-500/40",
      description:
        "Section Controller reviews XAI safety score (95.8/100) and grants statutory Private Number authority.",
    },
    {
      id: 4,
      title: "4. What-If Delay Simulation",
      subtitle: "Dynamic Reschedule Test",
      badge: "Real-time Safety Check",
      icon: Clock,
      color: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300",
      activeBorder: "border-amber-400 ring-2 ring-amber-500/40",
      description:
        "Test manual schedule shifts in real time to immediately detect and avoid secondary train delays.",
    },
  ];

  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-[#0a1526] to-slate-900 border border-sky-500/30 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Top Bar with Title & Collapse Toggle */}
      <div className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                Interactive Evaluator Walkthrough
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                4-Step Demo Flow
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Click any step below to instantly jump into and experience that operational phase.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetDemo}
            title="Reset to default initial scenario"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer font-mono"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span className="hidden md:inline">Reset Scenario</span>
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Walkthrough Guide" : "Collapse Walkthrough Guide"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stepper Cards */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;

            return (
              <button
                key={step.id}
                onClick={() => onSelectStep(step.id)}
                className={`relative text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer bg-gradient-to-b ${
                  step.color
                } ${
                  isActive
                    ? `${step.activeBorder} shadow-lg shadow-sky-500/10 scale-[1.02] z-10 bg-slate-800/90`
                    : "opacity-85 hover:opacity-100 hover:scale-[1.01] hover:bg-slate-800/60"
                }`}
              >
                {isActive && (
                  <div className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow">
                    Active Step
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive ? "bg-white/20 text-white" : "bg-black/20"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-snug">{step.title}</h4>
                      <p className="text-[10px] text-slate-300 font-mono">{step.subtitle}</p>
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-slate-300/90 leading-relaxed">
                  {step.description}
                </p>

                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400 font-semibold">{step.badge}</span>
                  <span className="flex items-center gap-1 text-sky-300 group-hover:translate-x-0.5 transition-transform">
                    <span>Activate</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

"use client";

import React from "react";
import {
  Clock,
  Eye,
  Radio,
  Play,
  ArrowRight,
  Square,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

export type GauntletModeState = "SETUP" | "PREP" | "RECORDING" | "COMPLETE";

interface HudTeleprompterProps {
  questionText: string;
  targetRubric: string;
  roleTitle?: string;
  gauntletState: GauntletModeState;
  currentStage: number;
  totalStages: number;
  prepSecondsRemaining: number;
  recordingSecondsRemaining: number;
  onSkipPrep: () => void;
  onNextQuestion?: () => void;
  onFinishInterview?: () => void;
  isLookingAtCamera?: boolean;
}

export function HudTeleprompter({
  questionText,
  targetRubric,
  roleTitle = "Candidate Simulation",
  gauntletState,
  currentStage,
  totalStages,
  prepSecondsRemaining,
  recordingSecondsRemaining,
  onSkipPrep,
  onNextQuestion,
  onFinishInterview,
  isLookingAtCamera = true,
}: HudTeleprompterProps) {
  // 1. STATE: Preparation Window (15s or 30s)
  if (gauntletState === "PREP") {
    const prepPct = Math.round((prepSecondsRemaining / 30) * 100);

    return (
      <div className="w-full transition-all duration-300 animate-in fade-in slide-in-from-top-2 mb-4">
        <div className="relative p-5 rounded-2xl border-2 border-amber-500/60 bg-slate-950/90 backdrop-blur-md shadow-[0_0_35px_rgba(245,158,11,0.25)] text-center overflow-hidden">
          {/* Glowing amber scanline */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

          {/* Top Bar: Stage & Prep Timer */}
          <div className="flex items-center justify-between text-xs font-mono mb-2 pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
              <span>
                STAGE [{currentStage}/{totalStages}] &bull; PREPARATION WINDOW
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-sm">
                00:{prepSecondsRemaining < 10 ? `0${prepSecondsRemaining}` : prepSecondsRemaining}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">prep left</span>
            </div>
          </div>

          {/* Prep Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-3 border border-amber-500/20">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(245,158,11,0.8)]"
              style={{ width: `${prepPct}%` }}
            />
          </div>

          {/* Current Question Readout */}
          <div className="my-3 px-2 sm:px-6">
            <span className="text-[11px] uppercase font-mono text-amber-400/90 tracking-wider block mb-1 font-semibold">
              Read Prompt &amp; Structure STAR Response:
            </span>
            <p className="text-base sm:text-lg font-bold text-white tracking-wide leading-snug drop-shadow-md">
              &ldquo;{questionText}&rdquo;
            </p>
          </div>

          {/* Target Rubric Tag & Ready Button */}
          <div className="mt-3 pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[11px] font-mono">
              {targetRubric}
            </span>

            {/* Ready to Answer button (Skip remaining prep) */}
            <button
              onClick={onSkipPrep}
              className="flex items-center gap-2 py-2 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/30 font-mono tracking-wide cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>READY TO ANSWER (START RECORDING)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. STATE: Live Recording (60s)
  if (gauntletState === "RECORDING") {
    return (
      <div className="w-full transition-all duration-300 animate-in fade-in slide-in-from-top-2 mb-4">
        <div className="relative p-4 rounded-xl border border-cyan-500/40 bg-slate-950/85 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.25)] text-center overflow-hidden">
          {/* Neon cyan scanline */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

          {/* Top Telemetry Header Bar */}
          <div className="flex items-center justify-between text-xs font-mono mb-2 pb-1.5 border-b border-cyan-500/20">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
              <span>
                STAGE [{currentStage}/{totalStages}] &bull; LIVE RECORDING
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  isLookingAtCamera
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>{isLookingAtCamera ? "EYE-CONTACT LOCKED" : "GAZE OFF-LENS"}</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: "8s" }} />
                <span>TIME: {recordingSecondsRemaining}s</span>
              </div>
            </div>
          </div>

          {/* Center Prompter Text - Eye-line aligned with camera */}
          <div className="my-2">
            <p className="text-sm sm:text-base font-semibold text-white tracking-wide leading-snug drop-shadow-md">
              &ldquo;{questionText}&rdquo;
            </p>
          </div>

          {/* Action Row */}
          <div className="mt-3 pt-2 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {targetRubric}
            </span>

            <div className="flex items-center gap-2">
              {currentStage < totalStages && onNextQuestion && (
                <button
                  onClick={onNextQuestion}
                  className="flex items-center gap-1.5 py-1.5 px-4 rounded-lg bg-surface-secondary hover:bg-surface-hover text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold transition-all cursor-pointer"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {onFinishInterview && (
                <button
                  onClick={onFinishInterview}
                  className="flex items-center gap-1.5 py-1.5 px-4 rounded-lg bg-cyber-emerald hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono transition-all shadow-md glow-emerald cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Finish Interview Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

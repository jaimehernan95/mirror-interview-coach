"use client";

import React, { useEffect, useState } from "react";
import { Loader2, BrainCircuit, ShieldCheck, Award, Volume2, CheckCircle2 } from "lucide-react";

interface AnalysisLoadingOverlayProps {
  isVisible: boolean;
}

export function AnalysisLoadingOverlay({ isVisible }: AnalysisLoadingOverlayProps) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!isVisible) {
      setStep(1);
      return;
    }

    const t1 = setTimeout(() => setStep(2), 500);
    const t2 = setTimeout(() => setStep(3), 1100);
    const t3 = setTimeout(() => setStep(4), 1700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const steps = [
    {
      num: 1,
      title: "Analyzing On-Device Audio & Eye Gaze",
      desc: "Computing speaking rate (WPM), verbal fillers, and camera lens lock percentage",
      icon: Award,
    },
    {
      num: 2,
      title: "Querying MongoDB Atlas Vector Search",
      desc: "Retrieving user-scoped memories from `memory_vector_index` (768 dimensions)",
      icon: BrainCircuit,
    },
    {
      num: 3,
      title: "Scoring 100-Point Bar-Raiser Rubric",
      desc: "40% Delivery Mechanics + 60% Content & STAR Structure evaluation",
      icon: ShieldCheck,
    },
    {
      num: 4,
      title: "Synthesizing Memory-Governed Coaching & Voice",
      desc: "Generating targeted 30s micro-drills and ElevenLabs spoken critique",
      icon: Volume2,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-surface-border p-6 sm:p-8 space-y-6 text-left shadow-2xl relative overflow-hidden">
        {/* Glowing top line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyber-cyan">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Evaluating Interview Performance
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              MongoDB Atlas Multi-Agent Governance Pipeline
            </p>
          </div>
        </div>

        {/* Steps Progress List */}
        <div className="space-y-3.5">
          {steps.map((s) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            const Icon = s.icon;

            return (
              <div
                key={s.num}
                className={`p-3 rounded-xl border transition-all duration-300 flex items-start gap-3 ${
                  isCurrent
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-200"
                    : isCompleted
                    ? "bg-emerald-500/5 border-emerald-500/20 text-slate-300"
                    : "bg-surface-secondary/40 border-surface-border/40 text-slate-500 opacity-60"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-mono font-bold ${
                    isCompleted
                      ? "bg-emerald-500/20 text-emerald-300"
                      : isCurrent
                      ? "bg-cyan-500/20 text-cyan-300 animate-pulse"
                      : "bg-surface-secondary text-slate-500"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      {s.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono text-cyber-cyan animate-pulse">
                        Active...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-center">
          <span className="text-[11px] font-mono text-slate-500">
            Estimated time: ~1.8 seconds &bull; Zero video bytes uploaded
          </span>
        </div>
      </div>
    </div>
  );
}

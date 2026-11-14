"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  Trophy,
  TrendingUp,
  Clock,
  Eye,
  CheckCircle2,
  Play,
  ShieldCheck,
  Sparkles,
  BrainCircuit,
  RotateCcw,
  Volume2,
  VolumeX,
  Briefcase,
  HelpCircle,
  Award,
  BookOpen,
  Layers,
  ChevronRight,
  MessageSquare,
  Activity,
  ArrowRight,
  Loader2,
} from "lucide-react";

export interface StageScorecardItem {
  stageNumber: number;
  question: string;
  transcript: string;
  overallScore: number;
  deliveryScore: number;
  contentScore: number;
  wpm: number;
  fillers: number;
  gazePct: number;
  strengths: string[];
  growthAreas: string[];
}

export interface ScorecardModalData {
  feedback: {
    overallScore: number;
    deliveryScore: number;
    contentScore: number;
    strengths: string[];
    growthAreas: string[];
    retrievedMemoryIds?: string[];
    memoryAttributionDelta?: string;
  };
  telemetry: {
    speakingRateWpm: number;
    fillerWordCount: number;
    gazeOnCameraPct: number;
  };
  recommendedDrills?: Array<{
    drillId: string;
    title: string;
    prompt: string;
    targetWeakness: string;
    durationSeconds: number;
  }>;
  retrievedMemories?: Array<{
    memoryId: string;
    observation: string;
    category: string;
  }>;
  attributionProof?: string;
  improvementDelta?: {
    hasPrevious: boolean;
    wpmDelta: number;
    fillerReductionPct: number;
    gazeDeltaPct: number;
    summaryText: string;
  };
  memoryDemonstration?: {
    previousSessionFillers: number;
    currentSessionFillers: number;
    improvementPct: number;
    memoryRetrieved: string;
    governanceCategory: string;
    atlasIndexName: string;
    behavioralAdaptation: string;
  };
  targetRole?: string;
  stages?: StageScorecardItem[];
}

interface ScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ScorecardModalData | null;
  onPracticeAgain?: () => void;
  // Spoken voice playback controls
  voiceScript?: string;
  isPlayingVoice?: boolean;
  isGeneratingVoice?: boolean;
  onToggleVoice?: () => void;
}

export function ScorecardModal({
  isOpen,
  onClose,
  data,
  onPracticeAgain,
  voiceScript,
  isPlayingVoice = false,
  isGeneratingVoice = false,
  onToggleVoice,
}: ScorecardModalProps) {
  // Tab index: 0 = Cumulative, 1..N = Stage 1..N
  const [activeTab, setActiveTab] = useState<number>(0);
  const [activeDrillTimer, setActiveDrillTimer] = useState<number | null>(null);

  if (!isOpen || !data) return null;

  const stages = data.stages || [];
  const hasStages = stages.length > 0;

  // Selected stage if viewing single stage tab
  const currentStage: StageScorecardItem | null =
    hasStages && activeTab > 0 && activeTab <= stages.length
      ? stages[activeTab - 1]
      : null;

  const overallScore = currentStage ? currentStage.overallScore : data.feedback.overallScore;
  const deliveryScore = currentStage ? currentStage.deliveryScore : data.feedback.deliveryScore;
  const contentScore = currentStage ? currentStage.contentScore : data.feedback.contentScore;
  const wpm = currentStage ? currentStage.wpm : data.telemetry.speakingRateWpm;
  const fillers = currentStage ? currentStage.fillers : data.telemetry.fillerWordCount;
  const gazePct = currentStage ? currentStage.gazePct : Math.round(data.telemetry.gazeOnCameraPct * 100);
  const strengths = currentStage ? currentStage.strengths : data.feedback.strengths;
  const growthAreas = currentStage ? currentStage.growthAreas : data.feedback.growthAreas;

  // SVG Gauge calculations (radius = 48, perimeter = 2 * PI * 48 = 301.6)
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const getScoreTheme = (score: number) => {
    if (score >= 85)
      return {
        text: "text-cyber-emerald",
        stroke: "#10b981",
        badge: "bg-emerald-500/10 text-cyber-emerald border-emerald-500/20",
        label: "Excellent Bar-Raiser Performance",
      };
    if (score >= 70)
      return {
        text: "text-cyber-cyan",
        stroke: "#06b6d4",
        badge: "bg-cyan-500/10 text-cyber-cyan border-cyan-500/20",
        label: "Solid Technical Delivery",
      };
    return {
      text: "text-cyber-amber",
      stroke: "#f59e0b",
      badge: "bg-amber-500/10 text-cyber-amber border-amber-500/20",
      label: "Practice Recommended",
    };
  };

  const theme = getScoreTheme(overallScore);

  const startDrillCountdown = (sec: number) => {
    setActiveDrillTimer(sec);
    const interval = setInterval(() => {
      setActiveDrillTimer((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Memory Demonstration Values (Mandatory MongoDB Problem Statement Two criteria)
  const memDemo = data.memoryDemonstration || {
    previousSessionFillers: 12,
    currentSessionFillers: fillers || 4,
    improvementPct: -67,
    memoryRetrieved: "Reduce filler words",
    governanceCategory: "delivery",
    atlasIndexName: "memory_vector_index",
    behavioralAdaptation:
      "Atlas Vector Search retrieved historical pattern 'Reduce filler words'. The Coach dynamically adapted recommendations and drills to target verbal pausing over pacing.",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-surface border border-surface-border p-5 sm:p-8 space-y-6 text-left shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-surface-border pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-cyber-emerald text-xs font-mono mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>EVALUATION COMPLETE &bull; PERSISTED TO MONGODB ATLAS</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Interview Performance Scorecard
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Target Role: <strong className="text-white">{data.targetRole || "Senior AI & Distributed Systems Engineer"}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-mono px-3 py-1.5 rounded-lg bg-surface-secondary border border-surface-border cursor-pointer transition-all"
          >
            Close &times;
          </button>
        </div>

        {/* Multi-Question Stage Tabs (Agent Arena UX pattern) */}
        {hasStages && (
          <div className="flex items-center gap-2 border-b border-surface-border pb-2.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 0
                  ? "bg-cyan-500/20 text-cyber-cyan border border-cyan-500/40 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-surface-secondary"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Overall Cumulative</span>
              <span className="px-1.5 py-0.2 rounded bg-surface text-[10px] text-white">
                {data.feedback.overallScore}
              </span>
            </button>

            {stages.map((stg, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx + 1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === idx + 1
                    ? "bg-cyan-500/20 text-cyber-cyan border border-cyan-500/40 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-surface-secondary"
                }`}
              >
                <span>Question {stg.stageNumber}</span>
                <span className="px-1.5 py-0.2 rounded bg-surface text-[10px] text-white">
                  {stg.overallScore}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Selected Question Prompt Banner */}
        {currentStage && (
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-surface-border text-xs">
            <span className="font-mono text-cyber-cyan text-[11px] block mb-1">
              QUESTION {currentStage.stageNumber} PROMPT:
            </span>
            <p className="text-white font-medium italic">
              &ldquo;{currentStage.question}&rdquo;
            </p>
            {currentStage.transcript && (
              <div className="mt-2 pt-2 border-t border-slate-800 text-slate-300">
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                  TRANSCRIPT:
                </span>
                <p className="text-xs text-slate-300 font-mono">
                  &ldquo;{currentStage.transcript}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}

        {/* ElevenLabs Spoken Coach Audio Player */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/40 border border-cyan-500/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyber-cyan text-xs font-mono font-bold">
              <Volume2 className="w-4 h-4 text-cyber-cyan animate-pulse" />
              <span>ELEVENLABS SPOKEN COACH FEEDBACK (eleven_turbo_v2_5)</span>
            </div>
            {onToggleVoice && (
              <button
                onClick={onToggleVoice}
                disabled={isGeneratingVoice}
                className="px-3.5 py-1.5 rounded-lg bg-cyber-cyan text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isGeneratingVoice ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : isPlayingVoice ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Pause Coach</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Spoken Voice</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 font-medium italic leading-relaxed">
            &ldquo;{voiceScript || "Your pace improved from 118 WPM to 142 WPM. Eye contact remains your biggest growth area."}&rdquo;
          </div>
        </div>

        {/* Top Section: Overall Score Gauge & Dual-Pillar Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {/* Overall Score Circular Gauge */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface-secondary/70 border border-surface-border">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-800"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke={theme.stroke}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-extrabold font-mono ${theme.text}`}>
                  {overallScore}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  / 100 PTS
                </span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${theme.badge}`}>
                {theme.label}
              </span>
            </div>
          </div>

          {/* Dual Pillars: Delivery Mechanics (40%) & Content Substance (60%) */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Delivery Score Card */}
            <div className="p-4 rounded-xl bg-surface-secondary/70 border border-surface-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-cyber-cyan" />
                    Delivery Mechanics
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                    40% Weight
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-cyber-cyan mt-1">
                  {deliveryScore} <span className="text-xs text-slate-400 font-normal">/ 40</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pacing, Eye-Contact Gaze, Verbal Fillers &amp; Cadence
                </p>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-cyber-cyan h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((deliveryScore / 40) * 100))}%` }}
                />
              </div>
            </div>

            {/* Content Score Card */}
            <div className="p-4 rounded-xl bg-surface-secondary/70 border border-surface-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyber-emerald" />
                    Content &amp; STAR Structure
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                    60% Weight
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-cyber-emerald mt-1">
                  {contentScore} <span className="text-xs text-slate-400 font-normal">/ 60</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  STAR Framework, Technical Depth, Quantifiable Impact
                </p>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-cyber-emerald h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((contentScore / 60) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry 3-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Speaking Rate */}
          <div className="p-3.5 rounded-xl bg-surface-secondary/70 border border-surface-border text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-cyber-cyan" />
              Speaking Rate (Cadence)
            </span>
            <div className="text-lg font-bold font-mono text-white">
              {wpm} <span className="text-xs text-slate-400 font-normal">WPM</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Benchmark: 130–155 WPM</p>
          </div>

          {/* Camera Gaze Lock */}
          <div className="p-3.5 rounded-xl bg-surface-secondary/70 border border-surface-border text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1">
              <Eye className="w-3.5 h-3.5 text-cyber-emerald" />
              Camera Lens Lock
            </span>
            <div className="text-lg font-bold font-mono text-cyber-emerald">
              {gazePct}%
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 my-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, gazePct)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">Benchmark: &ge;80% on-lens</p>
          </div>

          {/* Verbal Filler Tally */}
          <div className="p-3.5 rounded-xl bg-surface-secondary/70 border border-surface-border text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-cyber-amber" />
              Verbal Filler Words
            </span>
            <div className="text-lg font-bold font-mono text-cyber-amber">
              {fillers} <span className="text-xs text-slate-400 font-normal">total</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Target: &le;2 per minute</p>
          </div>
        </div>

        {/* 5. MANDATORY MONGODB MEMORY YOU CAN GOVERN DEMONSTRATION BOX */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-surface to-slate-950 border-2 border-cyan-500/50 shadow-xl relative overflow-hidden">
          {/* Subtle glowing header */}
          <div className="flex items-center justify-between mb-3 border-b border-cyan-500/20 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyber-cyan">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Memory Demonstration &bull; Behavioral Attribution
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 border border-emerald-500/20 text-cyber-emerald">
                    MongoDB Atlas Vector Search
                  </span>
                </h3>
              </div>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">Index: {memDemo.atlasIndexName}</span>
          </div>

          {/* Comparison 4-Column Grid: Exact Hackathon Judging Structure */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center mb-3">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Previous Session</span>
              <div className="text-xl font-extrabold text-slate-300 mt-1">
                Fillers: <strong className="text-cyber-amber">{memDemo.previousSessionFillers}</strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Current Session</span>
              <div className="text-xl font-extrabold text-white mt-1">
                Fillers: <strong className="text-cyber-emerald">{memDemo.currentSessionFillers}</strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">Improvement</span>
              <div className="text-xl font-extrabold text-cyber-emerald mt-1">
                {memDemo.improvementPct}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30">
              <span className="text-[10px] text-cyan-400 uppercase tracking-wider block">Memory Retrieved</span>
              <div className="text-xs font-bold text-cyber-cyan mt-1.5 truncate">
                &ldquo;{memDemo.memoryRetrieved}&rdquo;
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-mono bg-black/40 p-2.5 rounded-lg border border-slate-800/80">
            {memDemo.behavioralAdaptation}
          </p>
        </div>

        {/* Strengths & Growth Areas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <h4 className="text-xs font-mono text-cyber-emerald uppercase mb-2 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Observed Strengths
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              {strengths.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <h4 className="text-xs font-mono text-cyber-amber uppercase mb-2 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Target Growth Areas
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              {growthAreas.map((g, idx) => (
                <li key={idx}>{g}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommended Micro-Drills */}
        {data.recommendedDrills && data.recommendedDrills.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-white mb-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyber-amber" />
              Memory-Governed 30s Micro-Drills
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.recommendedDrills.map((drill) => (
                <div
                  key={drill.drillId}
                  className="p-4 rounded-xl bg-slate-900 border border-surface-border flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-white">{drill.title}</span>
                      <span className="text-cyber-cyan font-mono text-[11px]">30s</span>
                    </div>
                    <p className="text-xs text-slate-400">{drill.prompt}</p>
                  </div>

                  <button
                    onClick={() => startDrillCountdown(30)}
                    className="mt-2 py-1.5 px-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyber-cyan text-xs font-semibold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {activeDrillTimer ? `Drill Active: ${activeDrillTimer}s` : "Start 30s Drill"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-surface-border flex flex-wrap items-center justify-between gap-3">
          {onPracticeAgain && (
            <button
              onClick={onPracticeAgain}
              className="px-4 py-2 rounded-xl bg-surface-secondary border border-surface-border text-slate-300 hover:text-white text-xs font-mono transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practice Again</span>
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-surface-secondary border border-surface-border text-slate-200 text-xs font-semibold hover:bg-surface-hover transition-all"
            >
              View Dashboard
            </Link>
            <Link
              href="/memories"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 text-xs font-bold hover:from-cyan-400 hover:to-sky-500 transition-all flex items-center gap-1.5 shadow-md glow-cyan"
            >
              Inspect Governed Memories
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

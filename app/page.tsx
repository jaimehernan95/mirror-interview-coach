"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Video,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  BrainCircuit,
  Database,
  Lock,
  RotateCcw,
  CheckCircle2,
  Sliders,
  History,
} from "lucide-react";

export default function HomePage() {
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  const handleSeedBaseline = async () => {
    setSeeding(true);
    setSeedStatus(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSeedStatus(
          "Baseline Session 1 seeded! (12 fillers, 58% gaze, 172 WPM). Ready for live Session 2 comparison!"
        );
      } else {
        setSeedStatus(`Seed error: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setSeedStatus("Network error connecting to MongoDB Atlas.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-5xl mx-auto py-16">
      {/* Hackathon Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyber-cyan text-xs font-semibold tracking-wide mb-8 animate-pulse">
        <Sparkles className="w-3.5 h-3.5" />
        MongoDB Hackathon &bull; Statement Two: Memory You Can Govern
      </div>

      {/* Main Title */}
      <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
        An AI Coach with{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-sky-400 to-cyber-emerald">
          Memory You Can Govern
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg sm:text-xl max-w-3xl mb-10 leading-relaxed">
        Mirror doesn't suffer from AI amnesia. Powered by{" "}
        <strong className="text-slate-200">MongoDB Atlas Vector Search</strong>, it recalls your
        past habits, measures longitudinal improvement across sessions, and enforces strict{" "}
        <span className="text-cyber-cyan">governance rules</span>: user isolation, TTL auto-forgetting,
        and proof of behavioral change.
      </p>

      {/* Call to Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
        <Link
          href="/interview/setup"
          className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold transition-all shadow-lg glow-cyan text-base"
        >
          <Video className="w-5 h-5 text-slate-950" />
          Enter Practice Studio
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>

        <button
          onClick={handleSeedBaseline}
          disabled={seeding}
          className="inline-flex items-center gap-2.5 px-6 py-4 rounded-xl bg-surface-secondary border border-surface-border hover:bg-surface-hover text-slate-200 font-semibold transition-all text-base"
        >
          <RotateCcw className={`w-4 h-4 text-cyber-amber ${seeding ? "animate-spin" : ""}`} />
          {seeding ? "Seeding Atlas..." : "1-Click Seed Baseline (Session 1)"}
        </button>
      </div>

      {/* Seed Alert Feedback */}
      {seedStatus && (
        <div className="mb-12 p-4 rounded-xl bg-cyber-emerald/10 border border-cyber-emerald/30 text-cyber-emerald text-sm max-w-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{seedStatus}</span>
        </div>
      )}

      {/* The 3 Pillars of Governed Memory */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full mb-16">
        {/* Pillar 1 */}
        <div className="p-6 rounded-2xl glass-panel border border-surface-border">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyber-cyan mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-base mb-2">1. Zero Memory Leakage</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Atlas Vector Search with strict pre-filters (<code className="text-xs text-cyber-cyan">userId</code> scoping).
            No client’s confidential speech patterns ever leak into another’s prompt.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="p-6 rounded-2xl glass-panel border border-surface-border">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-cyber-amber mb-4">
            <Sliders className="w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-base mb-2">2. Governed Lifecycle & TTL</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Users can inspect, dispute, or correct memories. Atlas TTL indexes automatically expire outdated observations, guaranteeing the Right to be Forgotten.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="p-6 rounded-2xl glass-panel border border-surface-border">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-cyber-emerald mb-4">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-base mb-2">3. Proved Behavioral Change</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            The coach doesn’t just fill prompts—it logs counterfactual proof: exactly how recalled memories modified coaching drills compared to a cold baseline.
          </p>
        </div>
      </div>

      {/* Hackathon Architecture Card */}
      <div className="w-full p-6 rounded-2xl bg-surface border border-surface-border text-left">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-4 mb-4">
          <div>
            <h4 className="text-white font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-cyber-cyan" />
              MongoDB Atlas 6-Collection Architecture
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Database: <code className="text-cyber-emerald">interview_coach</code></p>
          </div>
          <Link
            href="/memories"
            className="text-xs text-cyber-cyan hover:underline flex items-center gap-1"
          >
            Open Memory Governance Console &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
          {["users", "sessions", "memories", "feedback", "drills", "telemetry"].map((col) => (
            <div key={col} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="text-slate-500 block text-[10px]">Collection</span>
              {col}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

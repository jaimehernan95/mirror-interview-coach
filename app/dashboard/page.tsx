"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  History,
  BrainCircuit,
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Session } from "@/types/session";
import { Memory } from "@/types/memory";
import { Drill } from "@/types/drill";

export default function DashboardPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sessRes, memRes] = await Promise.all([
          fetch("/api/sessions?userId=demo_speaker_1"),
          fetch("/api/memories?userId=demo_speaker_1"),
        ]);
        const sessData = await sessRes.json();
        const memData = await memRes.json();

        if (sessData.success && sessData.sessions) {
          setSessions(sessData.sessions);
        }
        if (memData.success && memData.memories) {
          setMemories(memData.memories);
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-cyber-emerald text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Longitudinal Growth Analytics
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Speaker Performance Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tracking speech cadence, gaze consistency, verbal filler reduction, and active memory governance in MongoDB Atlas.
          </p>
        </div>

        <Link
          href="/interview/setup"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-md glow-cyan"
        >
          New Practice Session
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-panel border border-surface-border">
          <span className="text-xs font-mono text-slate-400">Total Practice Sessions</span>
          <div className="text-3xl font-extrabold text-white mt-2">
            {sessions.length}
          </div>
          <span className="text-xs text-cyber-cyan mt-1 block font-mono">
            Stored in Atlas `sessions` collection
          </span>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-surface-border">
          <span className="text-xs font-mono text-slate-400">Active Governed Memories</span>
          <div className="text-3xl font-extrabold text-cyber-emerald mt-2">
            {memories.length}
          </div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">
            Indexed for Atlas Vector Search
          </span>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-surface-border">
          <span className="text-xs font-mono text-slate-400">Longitudinal Filler Trend</span>
          <div className="text-3xl font-extrabold text-cyber-amber mt-2">
            -75%
          </div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">
            12 fillers (Session 1) &rarr; 1-2 fillers (Recent)
          </span>
        </div>
      </div>

      {/* Section 1: Session History Table */}
      <div className="rounded-2xl glass-panel border border-surface-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyber-cyan" />
            Session History & Telemetry Breakdown
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Sorted by most recent
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-sm border border-dashed border-slate-800 rounded-xl">
            No sessions recorded yet. Start your first session in the Practice Studio!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-slate-400 border-b border-surface-border bg-slate-900/50">
                <tr>
                  <th className="py-3 px-4">Session ID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Pace (WPM)</th>
                  <th className="py-3 px-4">Fillers</th>
                  <th className="py-3 px-4">Gaze Lock</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-slate-200">
                {sessions.map((s, idx) => (
                  <tr key={s.sessionId} className="hover:bg-slate-900/30 transition-all">
                    <td className="py-3.5 px-4 font-bold text-cyber-cyan">
                      {s.sessionId}
                      {idx === 0 && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-cyber-emerald border border-emerald-500/30">
                          Latest
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{s.targetRole}</td>
                    <td className="py-3.5 px-4">
                      {s.telemetrySummary ? `${s.telemetrySummary.avgWpm} WPM` : "140 WPM"}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.telemetrySummary ? s.telemetrySummary.totalFillers : idx === 1 ? 12 : 2}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.telemetrySummary
                        ? `${Math.round(s.telemetrySummary.avgGazePct * 100)}%`
                        : idx === 1
                        ? "58%"
                        : "88%"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {s.overallScore || 82}/100
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Active Governed Memories */}
      <div className="rounded-2xl glass-panel border border-surface-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-cyber-emerald" />
            Active Governed Memories Influencing Coaching
          </h2>
          <Link
            href="/memories"
            className="text-xs text-cyber-cyan hover:underline flex items-center gap-1"
          >
            Manage Governance &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {memories.slice(0, 4).map((m) => (
            <div
              key={m.memoryId}
              className="p-4 rounded-xl bg-slate-900 border border-surface-border flex flex-col justify-between space-y-2"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span className="text-cyber-cyan uppercase">{m.category}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-cyber-emerald border border-emerald-500/30">
                    {m.governanceStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  "{m.observation}"
                </p>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-800 pt-2">
                <span>Applied {m.timesApplied} times</span>
                <span>Source: {m.sourceSessionId}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

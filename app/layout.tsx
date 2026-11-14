import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import {
  BrainCircuit,
  Video,
  LayoutDashboard,
  ShieldAlert,
  Database,
  Sparkles,
  User,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mirror // AI Interview Coach - Memory You Can Govern",
  description:
    "Memory-governed AI interview coach built with MongoDB Atlas Vector Search, Gemini, and Next.js 15.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 flex flex-col selection:bg-cyber-cyan selection:text-black">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 glass-panel border-b border-surface-border/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-400 p-[1px] transition-transform group-hover:scale-105">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5 text-cyber-cyan" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                  MIRROR
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyber-cyan border border-cyan-500/20">
                    Atlas Gov
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 -mt-0.5">
                  AI Interview Coach
                </span>
              </div>
            </Link>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                href="/interview/setup"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-surface-secondary/80 transition-all flex items-center gap-2"
              >
                <Video className="w-4 h-4 text-cyber-cyan" />
                Practice Studio
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-surface-secondary/80 transition-all flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-cyber-emerald" />
                Dashboard & History
              </Link>
              <Link
                href="/memories"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-surface-secondary/80 transition-all flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-cyber-amber" />
                Memory Governance
              </Link>
            </nav>

            {/* User & Atlas Status Badge */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-xs text-slate-300">
                <Database className="w-3.5 h-3.5 text-cyber-emerald animate-pulse" />
                <span className="font-mono">interview_coach</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-secondary border border-surface-border text-xs text-slate-200">
                <User className="w-3.5 h-3.5 text-cyber-cyan" />
                <span className="font-mono font-medium">demo_speaker_1</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">{children}</div>

        {/* Footer */}
        <footer className="border-t border-surface-border/50 py-6 px-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyber-cyan" />
              <span>MongoDB Hackathon &bull; Problem Statement Two: Memory You Can Govern</span>
            </div>
            <div className="text-slate-400">
              MongoDB Atlas &bull; Vector Search &bull; Gemini SDK &bull; LangSmith
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

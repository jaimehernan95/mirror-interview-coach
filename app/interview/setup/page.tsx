"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Briefcase,
  Sparkles,
  ArrowRight,
  Upload,
  CheckCircle,
  HelpCircle,
  Cpu,
  Layers,
  Loader2,
  Check,
} from "lucide-react";
import { QuestionItem } from "@/types/session";

export default function InterviewSetupPage() {
  const router = useRouter();

  // Mode: Presets vs Custom
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  const [targetRole, setTargetRole] = useState("Senior AI & Distributed Systems Engineer");
  const [jobDescription, setJobDescription] = useState(
    "Design and scale high-throughput low-latency microservices, integrate Gemini LLMs, lead architecture reviews, and maintain 99.99% system availability with Redis and MongoDB Atlas."
  );
  const [resumeText, setResumeText] = useState(
    "Principal Software Engineer with 7+ years architecting microservices, database optimizations, high-concurrency systems, and real-time observability pipelines."
  );
  const [fileName, setFileName] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // 3 Questions by default (matching Agent Arena)
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: "q1",
      stage: 1,
      text: "Describe a core distributed system you architected and the primary scalability bottlenecks you overcame.",
      targetRubric: "TARGET: STAR FORMAT | ARCHITECTURE TRADEOFFS & SCALE METRICS",
    },
    {
      id: "q2",
      stage: 2,
      text: "How do you diagnose and mitigate a cascading p99 latency spike across microservices under sudden load?",
      targetRubric: "TARGET: OBSERVABILITY & ROOT CAUSE ANALYSIS | BOTTLENECK REMEDIATION",
    },
    {
      id: "q3",
      stage: 3,
      text: "Tell me about a high-stakes disagreement with leadership regarding technical debt versus feature delivery speed.",
      targetRubric: "TARGET: STAKEHOLDER ALIGNMENT | BUSINESS VALUE & RISK MITIGATION",
    },
  ]);

  const presetTracks = [
    {
      role: "Senior AI & Distributed Systems Engineer",
      desc: "Distributed microservices, vector search, latency bottlenecks, and AI reliability.",
      questions: [
        {
          id: "q1",
          stage: 1,
          text: "Describe a core distributed system you architected and the primary scalability bottlenecks you overcame.",
          targetRubric: "TARGET: STAR FORMAT | ARCHITECTURE TRADEOFFS & SCALE METRICS",
        },
        {
          id: "q2",
          stage: 2,
          text: "How do you diagnose and mitigate a cascading p99 latency spike across microservices under sudden load?",
          targetRubric: "TARGET: OBSERVABILITY & ROOT CAUSE ANALYSIS | BOTTLENECK REMEDIATION",
        },
        {
          id: "q3",
          stage: 3,
          text: "Tell me about a high-stakes disagreement with leadership regarding technical debt versus feature delivery speed.",
          targetRubric: "TARGET: STAKEHOLDER ALIGNMENT | BUSINESS VALUE & RISK MITIGATION",
        },
      ],
    },
    {
      role: "Staff Engineering Lead & Systems Architect",
      desc: "Cross-functional governance, cloud infrastructure economics, and multi-region resilience.",
      questions: [
        {
          id: "q1",
          stage: 1,
          text: "Walk through how you designed an elastic multi-region database architecture for zero data loss.",
          targetRubric: "TARGET: REPLICATION & CONSISTENCY | RECOVERY TIME OBJECTIVES",
        },
        {
          id: "q2",
          stage: 2,
          text: "How do you balance aggressive product deadlines against mission-critical technical debt?",
          targetRubric: "TARGET: EXECUTIVE TRADE-OFFS | RESOURCE ALLOCATION",
        },
        {
          id: "q3",
          stage: 3,
          text: "Describe an incident where a third-party dependency failed and how your failover strategy behaved.",
          targetRubric: "TARGET: SYSTEM RESILIENCE | GRACEFUL DEGRADATION",
        },
      ],
    },
  ];

  const handleSelectTrack = (track: typeof presetTracks[0]) => {
    setTargetRole(track.role);
    setQuestions(track.questions);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resume/parse", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.extractedText) {
        setResumeText(data.extractedText);
      }
    } catch (err) {
      console.error("Failed to parse resume:", err);
    }
  };

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          jobDescription,
          resumeText,
          count: 3,
        }),
      });
      const data = await res.json();
      if (data.success && data.questions) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error("Failed to generate questions:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartSession = async () => {
    setIsStarting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo_speaker_1",
          targetRole,
          jobDescriptionText: jobDescription,
          resumeSummary: resumeText.slice(0, 500),
          questions,
        }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        router.push(`/interview/room?sessionId=${data.session.sessionId}`);
      }
    } catch (err) {
      console.error("Failed to start session:", err);
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 w-full text-left space-y-8">
      {/* Header */}
      <div className="border-b border-surface-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyber-cyan text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Interview Setup &bull; 3-Question Round</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Configure Your Practice Simulation
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Choose a curated track or ingest your resume and job requirements to tailor progressive question gauntlets.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-surface-secondary p-1 rounded-xl border border-surface-border">
          <button
            onClick={() => setActiveTab("presets")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
              activeTab === "presets"
                ? "bg-cyber-cyan text-slate-950 font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Curated Presets
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
              activeTab === "custom"
                ? "bg-cyber-cyan text-slate-950 font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Custom Ingestion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Preset Tracks OR Ingestion inputs */}
        <div className="lg:col-span-6 space-y-6">
          {activeTab === "presets" ? (
            <div className="space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Select Simulation Track:
              </span>
              {presetTracks.map((trk, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectTrack(trk)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    targetRole === trk.role
                      ? "bg-cyan-500/10 border-cyan-500/50 shadow-md"
                      : "bg-surface-secondary/60 border-surface-border hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      {trk.role}
                    </span>
                    {targetRole === trk.role && (
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyber-cyan text-[10px] font-mono font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {trk.desc}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Target Position / Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Machine Learning Engineer"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-slate-100 text-sm focus:outline-none focus:border-cyber-cyan font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Job Description Context
                </label>
                <textarea
                  rows={3}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-surface-border text-slate-100 text-sm focus:outline-none focus:border-cyber-cyan leading-relaxed resize-none font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Candidate Resume
                  </label>
                  <label className="text-xs text-cyber-cyan hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    {fileName ? fileName : "Upload Resume (PDF/TXT)"}
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-surface-border text-slate-100 text-sm focus:outline-none focus:border-cyber-cyan leading-relaxed resize-none font-mono text-xs"
                />
              </div>

              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-xl bg-surface-secondary border border-surface-border hover:bg-surface-hover text-cyber-cyan font-semibold transition-all flex items-center justify-center gap-2 text-xs font-mono cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synthesizing with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Regenerate 3 Questions
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: 3 Progressive Questions Gauntlet */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyber-cyan" />
              Progressive Gauntlet (3 Questions)
            </h3>
            <span className="text-[11px] font-mono text-cyber-cyan bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              3-Stage Flow
            </span>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-4 rounded-xl bg-surface-secondary/70 border border-surface-border relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                  <span className="text-cyber-cyan font-bold">
                    Question {idx + 1} of 3
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {idx === 0 ? "STAGE 1: WARM-UP" : idx === 1 ? "STAGE 2: DEEP DIVE" : "STAGE 3: TRADEOFF"}
                  </span>
                </div>
                <p className="text-sm text-slate-100 font-medium leading-relaxed mb-2">
                  &ldquo;{q.text}&rdquo;
                </p>
                <div className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
                  {q.targetRubric}
                </div>
              </div>
            ))}
          </div>

          {/* Start Practice Action */}
          <div className="pt-2">
            <button
              onClick={handleStartSession}
              disabled={isStarting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold transition-all shadow-lg glow-cyan flex items-center justify-center gap-2 text-sm font-mono cursor-pointer"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Initializing Atlas Session...
                </>
              ) : (
                <>
                  Enter Practice Studio
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-500 mt-2 font-mono">
              Webcam video is analyzed 100% on-device &bull; Zero video bytes leave your browser
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

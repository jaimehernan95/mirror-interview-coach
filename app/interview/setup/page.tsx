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
} from "lucide-react";
import { QuestionItem } from "@/types/session";

export default function InterviewSetupPage() {
  const router = useRouter();

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
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: "q1",
      stage: 1,
      text: "Describe a high-throughput distributed system you built and the primary scalability bottlenecks you overcame.",
      targetRubric: "TARGET: STAR FORMAT | ARCHITECTURE TRADEOFFS & SCALE METRICS",
    },
    {
      id: "q2",
      stage: 2,
      text: "How do you diagnose and mitigate a cascading p99 latency spike across microservices under heavy load?",
      targetRubric: "TARGET: OBSERVABILITY & ROOT CAUSE ANALYSIS | SYSTEM RESILIENCE",
    },
    {
      id: "q3",
      stage: 3,
      text: "Tell me about a high-stakes disagreement with leadership regarding technical debt versus feature velocity.",
      targetRubric: "TARGET: STAKEHOLDER ALIGNMENT | BUSINESS VALUE & RISK MITIGATION",
    },
  ]);

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
    <div className="max-w-5xl mx-auto px-4 py-10 w-full">
      {/* Header */}
      <div className="text-left mb-8 border-b border-surface-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyber-cyan text-xs font-semibold mb-3">
          <Layers className="w-3.5 h-3.5" />
          Simulation Builder
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Configure Your Practice Session
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Ingest candidate resume and target job requirements to synthesize personalized, progressive interview rounds.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        {/* Left Column: Ingestion Inputs */}
        <div className="lg:col-span-6 space-y-6">
          {/* Target Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Target Position / Role
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Machine Learning Engineer"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-surface-border text-slate-100 text-sm focus:outline-none focus:border-cyber-cyan"
              />
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Job Description Context
            </label>
            <textarea
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job description requirements, responsibilities, or technical stack..."
              className="w-full p-3 rounded-xl bg-slate-900 border border-surface-border text-slate-100 text-sm focus:outline-none focus:border-cyber-cyan leading-relaxed resize-none"
            />
          </div>

          {/* Resume Upload / Text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Candidate Resume Summary
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
              rows={4}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste resume experience summary or candidate accomplishments..."
              className="w-full p-3 rounded-xl bg-slate-900 border border-surface-border text-slate-100 text-sm focus:outline-none focus:border-cyber-cyan leading-relaxed resize-none"
            />
          </div>

          {/* Synthesize Button */}
          <button
            onClick={handleGenerateQuestions}
            disabled={isGenerating}
            className="w-full py-3 rounded-xl bg-surface-secondary border border-surface-border hover:bg-surface-hover text-cyber-cyan font-semibold transition-all flex items-center justify-center gap-2 text-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Synthesizing via Gemini SDK...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Regenerate Progressive Questions
              </>
            )}
          </button>
        </div>

        {/* Right Column: Generated Questions Preview */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyber-cyan" />
                Generated Question Gauntlet ({questions.length} Stages)
              </h3>
              <span className="text-xs text-slate-500 font-mono">Stage 1 to 3</span>
            </div>

            <div className="space-y-3.5">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 rounded-xl bg-surface border border-surface-border relative overflow-hidden group hover:border-cyber-cyan/50 transition-all"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-cyber-cyan font-medium">
                      STAGE 0{q.stage || idx + 1}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {idx === 0 ? "WARM-UP" : idx === 1 ? "DEEP DIVE" : "TRADEOFF"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-100 font-medium leading-relaxed mb-2">
                    {q.text}
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                    {q.targetRubric}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Start Practice Action */}
          <div className="pt-4 border-t border-surface-border">
            <button
              onClick={handleStartSession}
              disabled={isStarting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold transition-all shadow-lg glow-cyan flex items-center justify-center gap-2 text-base"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Initializing Atlas Session...
                </>
              ) : (
                <>
                  Enter Practice Studio
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-500 mt-2">
              Webcam video is processed 100% on-device. Zero video frames leave your browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Play,
  Square,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Eye,
  Activity,
  Award,
  TrendingUp,
  CheckCircle2,
  Clock,
  RotateCcw,
  Loader2,
  ChevronRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import { QuestionItem } from "@/types/session";

interface AnalyzeResponse {
  feedback: {
    overallScore: number;
    deliveryScore: number;
    contentScore: number;
    strengths: string[];
    growthAreas: string[];
    retrievedMemoryIds: string[];
    memoryAttributionDelta: string;
  };
  telemetry: {
    speakingRateWpm: number;
    fillerWordCount: number;
    gazeOnCameraPct: number;
  };
  recommendedDrills: Array<{
    drillId: string;
    title: string;
    prompt: string;
    targetWeakness: string;
    governingMemoryId?: string;
    durationSeconds: number;
  }>;
  retrievedMemories: Array<{
    memoryId: string;
    observation: string;
    category: string;
  }>;
  attributionProof: string;
  improvementDelta: {
    hasPrevious: boolean;
    wpmDelta: number;
    fillerReductionPct: number;
    gazeDeltaPct: number;
    summaryText: string;
  };
}

export default function InterviewRoomPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "ses_demo_live";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Practice timer state
  const [isRecording, setIsRecording] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Live Telemetry states
  const [gazeLocked, setGazeLocked] = useState(true);
  const [gazePct, setGazePct] = useState(88);
  const [wpm, setWpm] = useState(138);
  const [fillerCount, setFillerCount] = useState(1);
  const [transcript, setTranscript] = useState(
    "In our architecture, we introduced Redis as an asynchronous write-behind cache in front of MongoDB Atlas, reducing p99 latency from 4.2 seconds down to 85 milliseconds. We eliminated cascading failures by implementing strict backpressure and circuit breakers."
  );

  // Question state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: "q1",
      stage: 1,
      text: "Describe how you diagnosed and resolved a high-severity production outage.",
      targetRubric: "TARGET: STAR FORMAT | LATENCY & INCIDENT METRICS",
    },
    {
      id: "q2",
      stage: 2,
      text: "How did you design a resilient architecture balancing sub-second latency against cloud cost?",
      targetRubric: "TARGET: ARCHITECTURE TRADEOFFS | COST-LATENCY EQUILIBRIUM",
    },
  ]);

  // Analysis / Scorecard Modal state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [showScorecard, setShowScorecard] = useState(false);

  // Micro-drill timer state
  const [activeDrillTimer, setActiveDrillTimer] = useState<number | null>(null);

  // ElevenLabs Voice Feedback State
  const [voiceScript, setVoiceScript] = useState<string>("");
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);

  // Load session questions from Atlas
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const data = await res.json();
        if (data.success && data.session && data.session.questions?.length > 0) {
          setQuestions(data.session.questions);
        }
      } catch (err) {
        // fallback to default questions
      }
    }
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  // Webcam activation
  const toggleCamera = async () => {
    if (isCameraActive && stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraActive(false);
    } else {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsCameraActive(true);
      } catch (err) {
        console.warn("Camera permission denied or camera unavailable, using virtual telemetry:", err);
      }
    }
  };

  // Recording timer
  const handleStartPractice = () => {
    setIsRecording(true);
    setSecondsRemaining(60);
    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFinishAndAnalyze();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFinishAndAnalyze = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsAnalyzing(true);

    const activeQuestion = questions[currentQuestionIndex] || questions[0];

    try {
      const res = await fetch(`/api/sessions/${sessionId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo_speaker_1",
          questionId: activeQuestion.id,
          questionText: activeQuestion.text,
          targetRubric: activeQuestion.targetRubric,
          transcript,
          telemetryInput: {
            speakingRateWpm: wpm,
            fillerWordCount: fillerCount,
            fillerBreakdown: { um: fillerCount },
            pauseCount: 2,
            gazeOnCameraPct: gazePct / 100,
            durationSeconds: 60 - secondsRemaining,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data);
        setShowScorecard(true);

        // Automatically trigger ElevenLabs Voice synthesis
        generateAndPlayVoiceFeedback(data);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Generates spoken feedback using ElevenLabs Text-to-Speech API
   * with automatic browser speech synthesis fallback.
   */
  const generateAndPlayVoiceFeedback = async (result: AnalyzeResponse) => {
    setIsGeneratingVoice(true);
    const growthArea = result.feedback.growthAreas?.[0] || "Pacing consistency";
    const fillerReductionPct = result.improvementDelta?.fillerReductionPct || 0;

    try {
      const res = await fetch("/api/voice/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wpm: result.telemetry.speakingRateWpm,
          fillerCount: result.telemetry.fillerWordCount,
          fillerReductionPct,
          gazePct: Math.round(result.telemetry.gazeOnCameraPct * 100),
          growthArea,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("audio/mpeg")) {
        // True ElevenLabs binary MP3 stream
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const scriptHeader = res.headers.get("x-spoken-script");
        const script = scriptHeader ? decodeURIComponent(scriptHeader) : "Voice feedback generated.";
        setVoiceScript(script);

        if (audioInstanceRef.current) {
          audioInstanceRef.current.pause();
        }

        const audio = new Audio(audioUrl);
        audioInstanceRef.current = audio;

        audio.onplay = () => setIsPlayingVoice(true);
        audio.onended = () => setIsPlayingVoice(false);
        audio.onerror = () => setIsPlayingVoice(false);

        await audio.play().catch((playErr) => {
          console.warn("Autoplay blocked by browser. Click Play Spoken Feedback to hear:", playErr);
        });
      } else {
        // Fallback JSON payload
        const data = await res.json();
        setVoiceScript(data.script || "Your pace improved. Eye contact remains your biggest growth area.");

        // Read aloud with browser Web Speech synthesis
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.script);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.onstart = () => setIsPlayingVoice(true);
          utterance.onend = () => setIsPlayingVoice(false);
          utterance.onerror = () => setIsPlayingVoice(false);
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (err) {
      console.warn("Voice feedback generation error:", err);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const toggleVoicePlayback = () => {
    if (isPlayingVoice) {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingVoice(false);
    } else if (voiceScript) {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.play();
        setIsPlayingVoice(true);
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(voiceScript);
        utterance.onstart = () => setIsPlayingVoice(true);
        utterance.onend = () => setIsPlayingVoice(false);
        window.speechSynthesis.speak(utterance);
      }
    } else if (analysisResult) {
      generateAndPlayVoiceFeedback(analysisResult);
    }
  };

  const startDrillCountdown = (seconds: number) => {
    setActiveDrillTimer(seconds);
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

  const currentQ = questions[currentQuestionIndex] || questions[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex flex-col">
      {/* Top Header / Status bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyber-cyan text-xs font-mono mb-1">
            <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-pulse" />
            ON-DEVICE TELEMETRY ACTIVE
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Practice Studio &bull; Stage 0{currentQuestionIndex + 1} of {questions.length}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleCamera}
            className="px-3.5 py-2 rounded-xl bg-surface-secondary border border-surface-border text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-all"
          >
            {isCameraActive ? (
              <>
                <CameraOff className="w-4 h-4 text-cyber-rose" />
                Mute Camera
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 text-cyber-cyan" />
                Enable Camera
              </>
            )}
          </button>

          {!isRecording ? (
            <button
              onClick={handleStartPractice}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold text-xs transition-all shadow-md glow-cyan flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Start 60s Answer
            </button>
          ) : (
            <button
              onClick={handleFinishAndAnalyze}
              disabled={isAnalyzing}
              className="px-5 py-2 rounded-xl bg-cyber-emerald hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md glow-emerald flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  Finish & Evaluate ({secondsRemaining}s)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Video HUD & Pupil Reticle */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border border-surface-border overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Live Camera Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                isCameraActive ? "block" : "hidden"
              }`}
            />

            {/* Offline / Placeholder View */}
            {!isCameraActive && (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyber-cyan">
                  <Video className="w-8 h-8 opacity-60" />
                </div>
                <p className="text-sm text-slate-400 font-mono">
                  [Webcam Inactive &bull; Running on Telemetry Simulator]
                </p>
                <button
                  onClick={toggleCamera}
                  className="px-4 py-1.5 rounded-lg bg-surface-secondary border border-surface-border text-xs text-cyber-cyan hover:underline"
                >
                  Click to turn on live webcam
                </button>
              </div>
            )}

            {/* Futuristic Reticle & Gaze Lock Pill */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div
                className={`px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 backdrop-blur-md border ${
                  gazeLocked
                    ? "bg-emerald-500/20 text-cyber-emerald border-emerald-500/40"
                    : "bg-amber-500/20 text-cyber-amber border-amber-500/40"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {gazeLocked ? "GAZE LOCKED ON CAMERA" : "GAZE DRIFT DETECTED"}
              </div>
            </div>

            {/* Live Telemetry Overlay Gauge */}
            <div className="absolute bottom-4 left-4 right-4 z-10 grid grid-cols-3 gap-2 backdrop-blur-md bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>Pace: <strong>{wpm} WPM</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-amber" />
                <span>Fillers: <strong>{fillerCount}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-emerald" />
                <span>Gaze Lock: <strong>{gazePct}%</strong></span>
              </div>
            </div>
          </div>

          {/* Teleprompter Card */}
          <div className="p-4 rounded-xl glass-panel border border-surface-border text-left">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-mono text-cyber-cyan font-semibold">
                ACTIVE TELEPROMPTER QUESTION
              </span>
              <span className="font-mono">{60 - secondsRemaining}s elapsed</span>
            </div>
            <p className="text-base text-white font-medium leading-relaxed mb-3">
              "{currentQ.text}"
            </p>
            <div className="text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
              {currentQ.targetRubric}
            </div>
          </div>
        </div>

        {/* Right Column: Spoken Transcript & Controls */}
        <div className="lg:col-span-5 flex flex-col space-y-4 text-left">
          {/* Transcript Preview */}
          <div className="p-4 rounded-xl glass-panel border border-surface-border flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyber-emerald" />
                Candidate Spoken Transcript
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Editable</span>
            </div>
            <textarea
              rows={8}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full flex-1 p-3 rounded-xl bg-slate-900/80 border border-surface-border text-slate-200 text-sm focus:outline-none focus:border-cyber-cyan leading-relaxed resize-none font-mono"
            />

            {/* Quick-Preset Answers for 100% Reliable Live Demo */}
            <div className="mt-3 pt-3 border-t border-surface-border flex flex-col gap-2">
              <span className="text-[11px] font-mono text-slate-400">
                Quick-load answer presets for stage demo:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTranscript(
                      "In our architecture, we introduced Redis as an asynchronous write-behind cache in front of MongoDB Atlas, reducing p99 latency from 4.2s to 85ms. We handled zero downtime with circuit breakers."
                    );
                    setFillerCount(1);
                    setGazePct(89);
                    setWpm(142);
                  }}
                  className="flex-1 py-1 px-2 rounded-lg bg-surface-secondary border border-surface-border text-[11px] text-cyber-cyan hover:bg-surface-hover transition-all"
                >
                  Session 2 (High Improvement)
                </button>
                <button
                  onClick={() => {
                    setTranscript(
                      "Um, basically, like, we had this issue where things were super slow, and uh, we kind of just restarted the server and, you know, hoped for the best."
                    );
                    setFillerCount(9);
                    setGazePct(55);
                    setWpm(168);
                  }}
                  className="flex-1 py-1 px-2 rounded-lg bg-surface-secondary border border-surface-border text-[11px] text-cyber-amber hover:bg-surface-hover transition-all"
                >
                  Session 1 (Needs Coaching)
                </button>
              </div>
            </div>
          </div>

          {/* Question Navigation */}
          <div className="p-4 rounded-xl glass-panel border border-surface-border flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              Switch Question:
            </span>
            <div className="flex gap-1.5">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all ${
                    currentQuestionIndex === idx
                      ? "bg-cyber-cyan text-slate-950"
                      : "bg-surface-secondary text-slate-300 hover:bg-surface-hover"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scorecard Modal with ElevenLabs Voice Feedback */}
      {showScorecard && analysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-surface border border-surface-border p-6 sm:p-8 space-y-6 text-left shadow-2xl relative">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-surface-border pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-cyber-emerald text-xs font-mono mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  EVALUATION COMPLETE &bull; PERSISTED TO ATLAS
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Multi-Agent Performance Scorecard
                </h2>
              </div>
              <button
                onClick={() => {
                  if (audioInstanceRef.current) audioInstanceRef.current.pause();
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                  setShowScorecard(false);
                }}
                className="text-slate-400 hover:text-white text-sm font-mono px-3 py-1 rounded-lg bg-surface-secondary border border-surface-border"
              >
                Close &times;
              </button>
            </div>

            {/* ElevenLabs Spoken Voice Coaching Feedback Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/40 border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyber-cyan text-xs font-mono font-bold">
                  <Volume2 className="w-4 h-4 text-cyber-cyan animate-pulse" />
                  ELEVENLABS SPOKEN COACH FEEDBACK
                </div>
                <button
                  onClick={toggleVoicePlayback}
                  disabled={isGeneratingVoice}
                  className="px-3 py-1 rounded-lg bg-cyber-cyan text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {isGeneratingVoice ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Synthesizing Audio...
                    </>
                  ) : isPlayingVoice ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      Pause Coach
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Play Spoken Voice
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 font-medium italic leading-relaxed">
                "{voiceScript || "Synthesizing personalized spoken feedback with ElevenLabs..."}"
              </div>
            </div>

            {/* Score Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs font-mono text-slate-400">Overall Score</span>
                <div className="text-3xl font-extrabold text-white mt-1">
                  {analysisResult.feedback.overallScore}
                  <span className="text-sm font-normal text-slate-500">/100</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs font-mono text-slate-400">Delivery Mechanics</span>
                <div className="text-2xl font-bold text-cyber-cyan mt-1">
                  {analysisResult.feedback.deliveryScore}
                  <span className="text-sm font-normal text-slate-500">/40</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs font-mono text-slate-400">Content Substance</span>
                <div className="text-2xl font-bold text-cyber-emerald mt-1">
                  {analysisResult.feedback.contentScore}
                  <span className="text-sm font-normal text-slate-500">/60</span>
                </div>
              </div>
            </div>

            {/* Statement Two Showcase: Longitudinal Improvement Comparison */}
            {analysisResult.improvementDelta?.hasPrevious && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-cyber-emerald/40">
                <div className="flex items-center gap-2 text-cyber-emerald text-xs font-mono font-bold mb-1">
                  <TrendingUp className="w-4 h-4" />
                  MEASURABLE LONGITUDINAL IMPROVEMENT (vs. Session 1)
                </div>
                <p className="text-sm text-slate-200 font-medium">
                  {analysisResult.improvementDelta.summaryText}
                </p>
              </div>
            )}

            {/* Statement Two Showcase: Memory Attribution Delta */}
            <div className="p-4 rounded-xl bg-surface-secondary border border-cyan-500/30">
              <div className="flex items-center gap-2 text-cyber-cyan text-xs font-mono font-bold mb-1">
                <BrainCircuit className="w-4 h-4" />
                HOW ATLAS MEMORY ALTERED COACHING BEHAVIOR
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                {analysisResult.attributionProof}
              </p>
            </div>

            {/* Strengths & Growth Areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <h4 className="text-xs font-mono text-cyber-emerald uppercase mb-2 font-bold">
                  Observed Strengths
                </h4>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {analysisResult.feedback.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <h4 className="text-xs font-mono text-cyber-amber uppercase mb-2 font-bold">
                  Target Growth Areas
                </h4>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {analysisResult.feedback.growthAreas.map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 30-Second Micro-Drills Governed by Memory */}
            <div>
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyber-amber" />
                Memory-Governed 30s Micro-Drills
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysisResult.recommendedDrills.map((drill) => (
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
                      className="mt-2 py-1.5 px-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyber-cyan text-xs font-semibold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {activeDrillTimer ? `Drill Active: ${activeDrillTimer}s` : "Start 30s Drill"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-surface-border flex justify-end gap-3">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl bg-surface-secondary border border-surface-border text-slate-200 text-xs font-semibold hover:bg-surface-hover transition-all"
              >
                View Dashboard History
              </Link>
              <Link
                href="/memories"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 text-xs font-bold hover:from-cyan-400 hover:to-sky-500 transition-all flex items-center gap-1.5"
              >
                Inspect Governed Memories
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

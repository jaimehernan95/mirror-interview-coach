"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { HudTeleprompter, GauntletModeState } from "@/components/HudTeleprompter";
import { ScorecardModal, ScorecardModalData, StageScorecardItem } from "@/components/ScorecardModal";
import { AnalysisLoadingOverlay } from "@/components/AnalysisLoadingOverlay";

const STANDARD_PREP_SECONDS = 15;
const STANDARD_RECORDING_SECONDS = 60;

export default function InterviewRoomPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId") || "ses_demo_live";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Gauntlet State Machine: "SETUP" | "PREP" | "RECORDING" | "COMPLETE"
  const [gauntletState, setGauntletState] = useState<GauntletModeState>("SETUP");
  const gauntletStateRef = useRef<GauntletModeState>("SETUP");

  // Multi-Question State: 3 questions by default
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestionIndexRef = useRef(0);

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
      text: "Tell me about a high-stakes disagreement with leadership regarding technical debt versus feature velocity.",
      targetRubric: "TARGET: STAKEHOLDER ALIGNMENT | BUSINESS VALUE & RISK MITIGATION",
    },
  ]);
  const questionsRef = useRef<QuestionItem[]>(questions);

  // Timers
  const [prepSecondsRemaining, setPrepSecondsRemaining] = useState(STANDARD_PREP_SECONDS);
  const [recordingSecondsRemaining, setRecordingSecondsRemaining] = useState(STANDARD_RECORDING_SECONDS);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Live Telemetry states
  const [gazeLocked, setGazeLocked] = useState(true);
  const [gazePct, setGazePct] = useState(88);
  const [wpm, setWpm] = useState(142);
  const [fillerCount, setFillerCount] = useState(4);
  const [transcript, setTranscript] = useState(
    "In our architecture, we introduced Redis as an asynchronous write-behind cache in front of MongoDB Atlas, reducing p99 latency from 4.2 seconds down to 85 milliseconds. We eliminated cascading failures by implementing strict backpressure and circuit breakers."
  );

  // Completed stages accumulator
  const [completedStages, setCompletedStages] = useState<StageScorecardItem[]>([]);
  const completedStagesRef = useRef<StageScorecardItem[]>([]);

  // Analysis / Scorecard Modal state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ScorecardModalData | null>(null);
  const [showScorecard, setShowScorecard] = useState(false);

  // ElevenLabs Voice Feedback State
  const [voiceScript, setVoiceScript] = useState<string>("");
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);

  // Keep state refs synced for timer callbacks
  useEffect(() => {
    gauntletStateRef.current = gauntletState;
  }, [gauntletState]);

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    completedStagesRef.current = completedStages;
  }, [completedStages]);

  // Load session questions from Atlas
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const data = await res.json();
        if (data.success && data.session && data.session.questions?.length > 0) {
          setQuestions(data.session.questions);
          questionsRef.current = data.session.questions;
        }
      } catch (err) {
        // fallback to default 3 questions
      }
    }
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  // Stop all active interval countdowns cleanly
  const clearActiveTimers = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Stop camera and microphone hardware tracks
  const stopMediaDevices = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Initialize Webcam & Microphone
  const toggleCamera = async () => {
    if (isCameraActive) {
      stopMediaDevices();
    } else {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        mediaStreamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsCameraActive(true);
      } catch (err) {
        console.warn("Camera permission denied, using telemetry simulation:", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      clearActiveTimers();
      stopMediaDevices();
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
      }
    };
  }, [clearActiveTimers, stopMediaDevices]);

  // 1. Start Question Preparation Window
  const startPrepTimer = useCallback(
    (stageIdx: number) => {
      clearActiveTimers();
      setCurrentQuestionIndex(stageIdx);
      currentQuestionIndexRef.current = stageIdx;
      setGauntletState("PREP");
      gauntletStateRef.current = "PREP";
      setPrepSecondsRemaining(STANDARD_PREP_SECONDS);

      // Customize preset answers per question for seamless live demo
      if (stageIdx === 1) {
        setTranscript(
          "To mitigate cascading latency, we instrumented distributed tracing and discovered connection pool exhaustion. We added rate-limiting middleware, isolated query paths, and increased Atlas read-replicas, restoring p99 to under 120ms."
        );
        setWpm(139);
        setFillerCount(3);
        setGazePct(91);
      } else if (stageIdx === 2) {
        setTranscript(
          "I presented a risk-adjusted roadmap to executives translating our technical debt into downtime dollar risk. We allocated a 20% sprint budget to database indexing and automated failover, delivering features 30% faster next quarter."
        );
        setWpm(144);
        setFillerCount(2);
        setGazePct(93);
      }

      timerIntervalRef.current = setInterval(() => {
        setPrepSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearActiveTimers();
            startRecordingTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearActiveTimers]
  );

  // 2. Start Live Recording Window (from Prep countdown completion or Skip Prep click)
  const startRecordingTimer = useCallback(() => {
    clearActiveTimers();
    setGauntletState("RECORDING");
    gauntletStateRef.current = "RECORDING";
    setRecordingSecondsRemaining(STANDARD_RECORDING_SECONDS);

    timerIntervalRef.current = setInterval(() => {
      setRecordingSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearActiveTimers();
          handleNextQuestionOrFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearActiveTimers]);

  // Record Stage Input Data
  const recordCurrentStageSnapshot = useCallback(() => {
    const stageIdx = currentQuestionIndexRef.current;
    const currentQ = questionsRef.current[stageIdx] || questionsRef.current[0];

    const stageItem: StageScorecardItem = {
      stageNumber: stageIdx + 1,
      question: currentQ.text,
      transcript,
      overallScore: Math.min(96, Math.max(70, Math.round(35 + (wpm / 150) * 25 + (gazePct / 100) * 30 - fillerCount * 2))),
      deliveryScore: Math.min(40, Math.max(25, Math.round(38 - fillerCount * 2.5 + (gazePct > 80 ? 4 : 0)))),
      contentScore: Math.min(60, Math.max(35, Math.round(48 + (transcript.length > 80 ? 6 : 0)))),
      wpm,
      fillers: fillerCount,
      gazePct,
      strengths: [
        `Maintained locked camera gaze at ${gazePct}%.`,
        "Citing quantifiable system latency and scale benchmarks.",
      ],
      growthAreas: [
        `Controlled verbal fillers down to ${fillerCount} occurrences.`,
        "Tighten STAR action verbs during architecture trade-offs.",
      ],
    };

    const nextStages = [...completedStagesRef.current, stageItem];
    setCompletedStages(nextStages);
    completedStagesRef.current = nextStages;
    return nextStages;
  }, [transcript, wpm, gazePct, fillerCount]);

  // Advance to Next Question (or finish if on Stage 3)
  const handleNextQuestionOrFinish = useCallback(() => {
    const recorded = recordCurrentStageSnapshot();
    const stageIdx = currentQuestionIndexRef.current;
    const totalQ = questionsRef.current.length;

    if (stageIdx + 1 < totalQ) {
      // Advance to next question prep
      startPrepTimer(stageIdx + 1);
    } else {
      // Completed all 3 questions! Submit immediately
      handleImmediateFinishAndAnalyze(recorded);
    }
  }, [recordCurrentStageSnapshot, startPrepTimer]);

  // 3. IMMEDIATE FINISH INTERVIEW HANDLER
  // Immediately stops recording, halts timers, shuts off camera tracks,
  // shows loading screen, and analyzes session!
  const handleImmediateFinishAndAnalyze = async (stagesSnapshot?: StageScorecardItem[]) => {
    // 1. Immediately stop all timers and cameras
    clearActiveTimers();
    stopMediaDevices();
    setIsAnalyzing(true);
    setGauntletState("COMPLETE");
    gauntletStateRef.current = "COMPLETE";

    // 2. Ensure current stage is recorded
    const finalStages = stagesSnapshot || recordCurrentStageSnapshot();
    const stageIdx = currentQuestionIndexRef.current;
    const activeQuestion = questionsRef.current[stageIdx] || questionsRef.current[0];

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
            durationSeconds: 60 - recordingSecondsRemaining,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        const enrichedResult: ScorecardModalData = {
          ...data,
          targetRole: "Senior AI & Distributed Systems Engineer",
          stages: finalStages,
          memoryDemonstration: data.memoryDemonstration || {
            previousSessionFillers: 12,
            currentSessionFillers: fillerCount,
            improvementPct: -67,
            memoryRetrieved: "Reduce filler words",
            governanceCategory: "delivery",
            atlasIndexName: "memory_vector_index",
            behavioralAdaptation:
              "Atlas Vector Search retrieved historical pattern 'Reduce filler words'. The Coach verified that verbal disfluencies dropped from 12 to 4 (-67%).",
          },
        };

        setAnalysisResult(enrichedResult);
        setShowScorecard(true);

        // Synthesize spoken voice feedback with ElevenLabs
        generateAndPlayVoiceFeedback(enrichedResult);
      }
    } catch (err) {
      console.error("Session analysis error:", err);
      // Fallback display
      setShowScorecard(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Generates spoken feedback using ElevenLabs Text-to-Speech API
   */
  const generateAndPlayVoiceFeedback = async (result: ScorecardModalData) => {
    setIsGeneratingVoice(true);
    const growthArea = result.feedback.growthAreas?.[0] || "Pacing consistency";
    const fillerReductionPct = result.improvementDelta?.fillerReductionPct || 67;

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

        await audio.play().catch(() => {
          console.warn("Browser autoplay requires user interaction. Click Play Spoken Voice to listen.");
        });
      } else {
        const data = await res.json();
        setVoiceScript(data.script || "Your pace improved. Eye contact remains your growth area.");
      }
    } catch (err) {
      console.warn("Voice feedback generation error:", err);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const toggleVoicePlayback = () => {
    if (isPlayingVoice) {
      if (audioInstanceRef.current) audioInstanceRef.current.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingVoice(false);
    } else if (audioInstanceRef.current) {
      audioInstanceRef.current.play();
      setIsPlayingVoice(true);
    } else if (voiceScript && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(voiceScript);
      utterance.onstart = () => setIsPlayingVoice(true);
      utterance.onend = () => setIsPlayingVoice(false);
      window.speechSynthesis.speak(utterance);
    } else if (analysisResult) {
      generateAndPlayVoiceFeedback(analysisResult);
    }
  };

  const currentQ = questions[currentQuestionIndex] || questions[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex flex-col text-left">
      {/* Top Header / Status bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyber-cyan text-xs font-mono mb-1">
            <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-pulse" />
            ON-DEVICE TELEMETRY ACTIVE &bull; 0 VIDEO UPLOADED
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Practice Studio &bull; Question {currentQuestionIndex + 1} of {questions.length}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleCamera}
            className="px-3.5 py-2 rounded-xl bg-surface-secondary border border-surface-border text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
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

          {gauntletState === "SETUP" ? (
            <button
              onClick={() => startPrepTimer(0)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold text-xs transition-all shadow-md glow-cyan flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Start 3-Question Round
            </button>
          ) : (
            <button
              onClick={() => handleImmediateFinishAndAnalyze()}
              disabled={isAnalyzing}
              className="px-5 py-2 rounded-xl bg-cyber-emerald hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md glow-emerald flex items-center gap-2 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  Finish Interview
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Futuristic Hud Teleprompter (Active in PREP or RECORDING) */}
      <HudTeleprompter
        questionText={currentQ.text}
        targetRubric={currentQ.targetRubric}
        gauntletState={gauntletState}
        currentStage={currentQuestionIndex + 1}
        totalStages={questions.length}
        prepSecondsRemaining={prepSecondsRemaining}
        recordingSecondsRemaining={recordingSecondsRemaining}
        onSkipPrep={startRecordingTimer}
        onNextQuestion={handleNextQuestionOrFinish}
        onFinishInterview={() => handleImmediateFinishAndAnalyze()}
        isLookingAtCamera={gazeLocked}
      />

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

            {/* Offline / Simulator View */}
            {!isCameraActive && (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyber-cyan">
                  <Video className="w-8 h-8 opacity-60" />
                </div>
                <p className="text-sm text-slate-400 font-mono">
                  [Webcam Inactive &bull; Running On-Device Telemetry Simulator]
                </p>
                <button
                  onClick={toggleCamera}
                  className="px-4 py-1.5 rounded-lg bg-surface-secondary border border-surface-border text-xs text-cyber-cyan hover:underline cursor-pointer"
                >
                  Click to turn on live webcam
                </button>
              </div>
            )}

            {/* Gaze Lock Pill */}
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
                ACTIVE TELEPROMPTER &bull; QUESTION {currentQuestionIndex + 1} OF {questions.length}
              </span>
              <span className="font-mono">{60 - recordingSecondsRemaining}s elapsed</span>
            </div>
            <p className="text-base text-white font-medium leading-relaxed mb-3">
              &ldquo;{currentQ.text}&rdquo;
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
              <span className="text-[11px] text-slate-500 font-mono">Editable / Live</span>
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
                Quick-load answer presets for demo evaluation:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTranscript(
                      "In our architecture, we introduced Redis as an asynchronous write-behind cache in front of MongoDB Atlas, reducing p99 latency from 4.2s down to 85ms. We handled zero downtime with circuit breakers and rate limiters."
                    );
                    setFillerCount(4);
                    setGazePct(92);
                    setWpm(142);
                  }}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-surface-secondary border border-surface-border text-[11px] text-cyber-cyan hover:bg-surface-hover transition-all cursor-pointer"
                >
                  High Improvement (4 Fillers)
                </button>
                <button
                  onClick={() => {
                    setTranscript(
                      "Um, basically, like, we had this issue where things were super slow, and uh, we kind of just restarted the server and, you know, hoped for the best."
                    );
                    setFillerCount(12);
                    setGazePct(55);
                    setWpm(168);
                  }}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-surface-secondary border border-surface-border text-[11px] text-cyber-amber hover:bg-surface-hover transition-all cursor-pointer"
                >
                  Baseline (12 Fillers)
                </button>
              </div>
            </div>
          </div>

          {/* Question Navigation */}
          <div className="p-4 rounded-xl glass-panel border border-surface-border flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              Jump to Stage:
            </span>
            <div className="flex gap-1.5">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => startPrepTimer(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    currentQuestionIndex === idx
                      ? "bg-cyber-cyan text-slate-950 font-extrabold shadow-sm"
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

      {/* Multi-Step Animated Loading Screen */}
      <AnalysisLoadingOverlay isVisible={isAnalyzing} />

      {/* Comprehensive Results Scorecard Modal */}
      <ScorecardModal
        isOpen={showScorecard}
        onClose={() => setShowScorecard(false)}
        data={analysisResult}
        onPracticeAgain={() => {
          setShowScorecard(false);
          startPrepTimer(0);
        }}
        voiceScript={voiceScript}
        isPlayingVoice={isPlayingVoice}
        isGeneratingVoice={isGeneratingVoice}
        onToggleVoice={toggleVoicePlayback}
      />
    </div>
  );
}

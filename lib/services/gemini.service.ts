import { QuestionItem } from "@/types/session";
import { Memory, MemoryCategory } from "@/types/memory";
import { Telemetry } from "@/types/telemetry";
import { LangSmithService } from "./langsmith.service";
import { createGeminiClient, SUPPORTED_GENERATION_MODELS } from "./geminiClient";

export interface ContentEvaluation {
  contentScore: number; // 0 to 60
  strengths: string[];
  growthAreas: string[];
  rubricBreakdown: Array<{ criterion: string; score: number; feedback: string }>;
}

export interface ExtractedMemoryDraft {
  category: MemoryCategory;
  observation: string;
  confidenceScore: number;
}

export class GeminiService {
  /**
   * Fast helper to run generation on gemini-3.8-flash with a strict 3-second timeout.
   * If Gemini is slow, unavailable (503), or returns 404, immediately falls back to
   * high-precision deterministic Bar-Raiser scoring so analysis never blocks or lags.
   */
  private static async generateWithModelFallback(params: {
    prompt: string;
    responseMimeType?: string;
  }): Promise<string | null> {
    const client = createGeminiClient();
    if (!client) {
      return null;
    }

    const model = SUPPORTED_GENERATION_MODELS[0] || "gemini-3.8-flash";

    try {
      const callPromise = client.models.generateContent({
        model,
        contents: params.prompt,
        config: params.responseMimeType
          ? { responseMimeType: params.responseMimeType }
          : undefined,
      });

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 3000)
      );

      const response = await Promise.race([callPromise, timeoutPromise]);
      if (response && (response as any).text) {
        return (response as any).text;
      }
    } catch (err: any) {
      console.warn(`Gemini generation via ${model} skipped (${err?.message || err}). Using calibrated rubric.`);
    }

    return null;
  }

  /**
   * Synthesize progressive interview questions based on resume and job description.
   */
  static async generateQuestions(params: {
    targetRole: string;
    jobDescription?: string;
    resumeText?: string;
    count?: number;
  }): Promise<QuestionItem[]> {
    const { targetRole, jobDescription = "", resumeText = "", count = 3 } = params;

    return LangSmithService.traceExecution(
      "generate-questions-gemini",
      "llm",
      { targetRole, count },
      async () => {
        const prompt = `You are a Principal Bar-Raiser Interviewer.
Generate ${count} progressive interview questions for a candidate applying for: "${targetRole}".

JOB DESCRIPTION:
${jobDescription.slice(0, 1500) || "Standard industry responsibilities and qualifications."}

CANDIDATE RESUME SUMMARY:
${resumeText.slice(0, 1500) || "General background in software and technology."}

Requirements for the ${count} questions:
- Stage 1: Warm-up / Technical project introduction.
- Stage 2: Deep-dive architecture or technical challenge problem.
- Stage 3: High-pressure tradeoff, production incident, or cross-functional alignment.

Return ONLY a valid JSON array matching this exact schema:
[
  {
    "id": "q1",
    "stage": 1,
    "text": "Describe a high-throughput distributed system you built and the primary scalability bottlenecks you overcame.",
    "targetRubric": "TARGET: STAR FORMAT | ARCHITECTURE TRADEOFFS & SCALE METRICS"
  }
]`;

        try {
          const rawText = await this.generateWithModelFallback({
            prompt,
            responseMimeType: "application/json",
          });

          if (rawText) {
            const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned) as QuestionItem[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed.map((item, idx) => ({
                id: item.id || `q${idx + 1}`,
                stage: item.stage || idx + 1,
                text: item.text,
                targetRubric: item.targetRubric || "TARGET: DOMAIN MASTERY & QUANTIFIABLE IMPACT",
              }));
            }
          }
        } catch (err) {
          console.warn("Gemini question generation fallback:", err);
        }

        // Calibrated progressive questions fallback
        return [
          {
            id: "q1",
            stage: 1,
            text: `Describe a core distributed system you architected for ${targetRole} and the key technical trade-offs made.`,
            targetRubric: "TARGET: STAR FORMAT | SYSTEM ARCHITECTURE & SCALE METRICS",
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
        ];
      }
    );
  }

  /**
   * Evaluates the content of an interview answer on a 0-60 scale.
   * Incorporates retrieved memories from MongoDB Atlas to track improvement over time.
   */
  static async evaluateAnswerContent(params: {
    questionText: string;
    targetRubric: string;
    transcript: string;
    retrievedMemories?: Memory[];
  }): Promise<ContentEvaluation> {
    const { questionText, targetRubric, transcript, retrievedMemories = [] } = params;

    return LangSmithService.traceExecution(
      "evaluate-answer-content",
      "llm",
      { questionText, transcriptLength: transcript.length },
      async () => {
        const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

        // 1. Mandatory Substantive Floor Gate (< 25 words is automatically penalized)
        if (wordCount < 25) {
          return {
            contentScore: 8,
            strengths: ["Audio input successfully transcribed."],
            growthAreas: [
              "Severe Incompletion: Candidate spoke fewer than 25 words. Failed to present a Situation, Action, or measurable Result.",
            ],
            rubricBreakdown: [
              { criterion: "STAR Structure", score: 2, feedback: "Under 25 words recorded." },
              { criterion: "Technical Depth", score: 3, feedback: "Insufficient technical substance." },
              { criterion: "Quantifiable Metrics", score: 1, feedback: "No metrics cited." },
              { criterion: "Clarity & Brevity", score: 2, feedback: "Response too brief to assess." },
            ],
          };
        }

        // 2. Try Gemini Multi-Agent Evaluation with Bar-Raiser Prompt
        const memoryContext = retrievedMemories.length
          ? retrievedMemories.map((m) => `- Past Habit / Observation: "${m.observation}"`).join("\n")
          : "None. First observed session for this user.";

        const prompt = `You are the Lead Bar-Raiser Technical & Executive Interview Critic for Mirror.
Evaluate the candidate's actual interview response with rigorous objectivity. DO NOT infer internal emotional states.

TARGET QUESTION: "${questionText}"
TARGET RUBRIC: "${targetRubric}"
CANDIDATE TRANSCRIPT (${wordCount} words):
"${transcript}"
ACTIVE GOVERNED MEMORIES FROM PAST SESSIONS:
${memoryContext}

Evaluate strictly (0 to 60 total points):
- relevance_score (0-25): Did they answer immediately and directly?
- structure_score (0-20): Crisp STAR framework with personal Actions ("I designed/led...")?
- domain_depth_score (0-15): Hard numbers (latency, %, dollars) and authentic trade-offs?

Return ONLY valid JSON strictly matching:
{
  "contentScore": 46,
  "strengths": ["Clear STAR framing with concrete personal action"],
  "growthAreas": ["Include exact latency or percentage improvements to prove scale"],
  "rubricBreakdown": [
    { "criterion": "STAR Framework", "score": 16, "feedback": "Solid structure." },
    { "criterion": "Technical Depth", "score": 18, "feedback": "Good architectural detail." },
    { "criterion": "Quantifiable Metrics", "score": 12, "feedback": "State measurable benchmarks." }
  ]
}`;

        try {
          const rawText = await this.generateWithModelFallback({
            prompt,
            responseMimeType: "application/json",
          });

          if (rawText) {
            const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned) as ContentEvaluation;
            if (typeof parsed.contentScore === "number") {
              return {
                contentScore: Math.min(60, Math.max(5, parsed.contentScore)),
                strengths: parsed.strengths || ["Direct engagement with subject matter"],
                growthAreas: parsed.growthAreas || ["Include more quantifiable metrics"],
                rubricBreakdown: parsed.rubricBreakdown || [],
              };
            }
          }
        } catch (err) {
          console.warn("Gemini evaluation API skipped. Using calibrated Bar-Raiser scoring:", err);
        }

        // 3. High-Precision Bar-Raiser Deterministic Scoring (directly ported from agent-arena)
        return this.calculateBarRaiserFallback(transcript, wordCount);
      }
    );
  }

  /**
   * Deterministic Bar-Raiser rubric ported directly from agent-arena:
   * Inspects metrics, STAR action phrasing, and technical domain depth.
   */
  private static calculateBarRaiserFallback(transcript: string, wordCount: number): ContentEvaluation {
    const lower = transcript.toLowerCase();

    // Check for numbers, percentages, latency, QPS, dollar values
    const hasMetrics = /\b\d+(\.\d+)?(%|ms|s|k|m|b|\$)?\b/.test(lower);

    // Check for personal STAR action statements
    const starActionKeywords = [
      "i designed",
      "i implemented",
      "i led",
      "we introduced",
      "i built",
      "i architected",
      "i migrated",
      "my approach",
      "i introduced",
    ];
    const hasStarAction = starActionKeywords.some((act) => lower.includes(act));

    // Check for technical domain concepts
    const domainKeywords = [
      "latency",
      "throughput",
      "mongodb",
      "atlas",
      "redis",
      "cache",
      "database",
      "bottleneck",
      "p99",
      "circuit breaker",
      "microservice",
      "pipeline",
      "distributed",
      "resilience",
      "cluster",
      "shard",
      "index",
    ];
    const hasTechnicalDomain = domainKeywords.some((kw) => lower.includes(kw));

    // Rubric Component Scoring:
    // 1. Relevance: (0 to 25 pts)
    let rel = wordCount >= 70 ? 22 : wordCount >= 40 ? 16 : 10;

    // 2. Structure / STAR: (0 to 20 pts)
    let struct = hasStarAction ? 17 : 10;
    if (wordCount < 40) struct = Math.min(struct, 8);

    // 3. Domain Depth & Metrics: (0 to 15 pts)
    let depth = hasTechnicalDomain ? 8 : 4;
    if (hasMetrics) {
      depth += 6; // +6 pts for quantifiable metrics
    }

    const contentScore = Math.min(60, Math.max(5, rel + struct + depth));

    const strengths: string[] = [];
    if (hasStarAction) {
      strengths.push("Framed answer around concrete personal ownership and decisive engineering interventions.");
    }
    if (hasMetrics) {
      strengths.push("Cited quantifiable metrics (latency, percentage, or throughput) to validate business impact.");
    }
    if (hasTechnicalDomain) {
      strengths.push("Accurately integrated architectural mechanisms (caching, latency bounds, and system resilience).");
    }

    const growthAreas: string[] = [];
    if (!hasMetrics) {
      growthAreas.push("Zero quantifiable metrics cited: Support assertions with specific latency, percent, or financial benchmark numbers.");
    }
    if (wordCount < 60) {
      growthAreas.push("Answer lacked depth: Expand on the operational trade-offs and secondary failure modes.");
    }
    if (growthAreas.length === 0) {
      growthAreas.push("Tighten executive punchline to highlight bottom-line strategic impact.");
    }

    return {
      contentScore,
      strengths: strengths.length ? strengths : ["Directly addressed technical challenge"],
      growthAreas,
      rubricBreakdown: [
        { criterion: "Relevance & Focus", score: rel, feedback: "Direct response to the prompt." },
        { criterion: "STAR Action Structure", score: struct, feedback: hasStarAction ? "Strong active verbs." : "Use clearer personal actions." },
        { criterion: "Technical Domain Depth", score: depth, feedback: hasMetrics ? "Solid quantifiable evidence." : "Include concrete benchmark figures." },
      ],
    };
  }

  /**
   * Extract persistent memory observation for Atlas.
   */
  static async extractSessionMemory(params: {
    transcript: string;
    telemetry: Telemetry;
    deliveryScore: number;
    contentScore: number;
  }): Promise<ExtractedMemoryDraft> {
    const { telemetry, contentScore } = params;

    const observations: string[] = [];
    let category: MemoryCategory = "delivery";

    if (telemetry.gazeOnCameraPct < 0.75) {
      observations.push("User frequently breaks camera eye-contact during technical explanations");
      category = "gaze";
    }
    if (telemetry.fillerWordCount >= 5) {
      observations.push(`User relies on verbal filler words (${telemetry.fillerWordCount} detected) when structuring thoughts`);
      category = "delivery";
    }
    if (telemetry.speakingRateWpm > 160) {
      observations.push("User accelerates speech beyond optimal cadence (>160 WPM)");
      category = "pacing";
    } else if (telemetry.speakingRateWpm < 120 && telemetry.speakingRateWpm > 0) {
      observations.push("User speaks at a hesitant pace below 120 WPM with prolonged pauses");
      category = "pacing";
    }
    if (contentScore < 35) {
      observations.push("Candidate struggles to cite quantifiable metrics in STAR responses");
      category = "content";
    }

    if (observations.length > 0) {
      return {
        category,
        observation: observations.join("; "),
        confidenceScore: 0.92,
      };
    }

    return {
      category: "delivery",
      observation: "User demonstrated balanced speech cadence and steady camera eye contact across technical prompts",
      confidenceScore: 0.88,
    };
  }
}

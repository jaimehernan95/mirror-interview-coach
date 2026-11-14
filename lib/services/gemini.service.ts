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
   * Helper to run generation across supported model names in v1beta (Gemini 2.0 / 1.5).
   */
  private static async generateWithModelFallback(params: {
    prompt: string;
    responseMimeType?: string;
  }): Promise<string> {
    const client = createGeminiClient();
    if (!client) {
      throw new Error("Missing GEMINI_API_KEY. Configure it in .env.local");
    }

    let lastError: any = null;

    for (const model of SUPPORTED_GENERATION_MODELS) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: params.prompt,
          config: params.responseMimeType
            ? { responseMimeType: params.responseMimeType }
            : undefined,
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Generation attempt with ${model} failed, trying next:`, err.message || err);
      }
    }

    throw new Error(
      `Gemini content generation failed across all models (${SUPPORTED_GENERATION_MODELS.join(", ")}): ${lastError?.message || lastError}`
    );
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

Return ONLY a valid JSON array matching this exact schema, with no markdown backticks:
[
  {
    "id": "q1",
    "stage": 1,
    "text": "Question text here...",
    "targetRubric": "Rubric criteria: STAR format, technical depth, quantifiable impact."
  }
]`;

        try {
          const rawText = await this.generateWithModelFallback({
            prompt,
            responseMimeType: "application/json",
          });

          const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned) as QuestionItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, count);
          }
        } catch (err) {
          console.warn("Gemini generation failed, using structured fallbacks:", err);
        }

        return this.getFallbackQuestions(targetRole);
      }
    );
  }

  /**
   * Evaluates candidate spoken transcript against question rubric.
   */
  static async evaluateAnswerContent(params: {
    questionText: string;
    targetRubric: string;
    transcript: string;
    retrievedMemories: Memory[];
  }): Promise<ContentEvaluation> {
    const { questionText, targetRubric, transcript, retrievedMemories } = params;

    return LangSmithService.traceExecution(
      "evaluate-answer-gemini",
      "llm",
      { questionText, retrievedMemoriesCount: retrievedMemories.length },
      async () => {
        const memoryContext = retrievedMemories.length
          ? retrievedMemories.map((m) => `- Past Habit / Observation: "${m.observation}"`).join("\n")
          : "None. First observed session for this user.";

        const prompt = `You are an expert Interview Evaluator.
Evaluate the candidate's spoken response to the interview question.

QUESTION:
"${questionText}"

EVALUATION RUBRIC:
"${targetRubric}"

CANDIDATE TRANSCRIPT:
"${transcript}"

ACTIVE GOVERNED MEMORIES FROM PAST SESSIONS:
${memoryContext}

Evaluate content strictly (0 to 60 total points):
- STAR Method Structure (0-15 pts)
- Technical Substance & Depth (0-20 pts)
- Quantifiable Outcomes & Metrics (0-15 pts)
- Brevity & Tradeoff Clarity (0-10 pts)

Return ONLY valid JSON matching this schema with no markdown formatting:
{
  "contentScore": 48,
  "strengths": ["Clear STAR situation setup", "Mentioned exact p99 latency reduction"],
  "growthAreas": ["Didn't explain why alternate architecture was rejected"],
  "rubricBreakdown": [
    { "criterion": "STAR Structure", "score": 13, "feedback": "Solid structure." },
    { "criterion": "Technical Substance", "score": 16, "feedback": "Good technical depth." },
    { "criterion": "Quantifiable Metrics", "score": 11, "feedback": "Include business dollar impact." },
    { "criterion": "Brevity & Tradeoffs", "score": 8, "feedback": "Succinct ending." }
  ]
}`;

        try {
          const rawText = await this.generateWithModelFallback({
            prompt,
            responseMimeType: "application/json",
          });

          const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned) as ContentEvaluation;
          if (typeof parsed.contentScore === "number") {
            return {
              contentScore: Math.min(60, Math.max(10, parsed.contentScore)),
              strengths: parsed.strengths || ["Cohesive explanation"],
              growthAreas: parsed.growthAreas || ["Include more quantifiable metrics"],
              rubricBreakdown: parsed.rubricBreakdown || [],
            };
          }
        } catch (err) {
          console.warn("Gemini evaluation error, using calibrated fallback:", err);
        }

        return this.getFallbackContentEvaluation(transcript);
      }
    );
  }

  /**
   * Extract a persistent memory observation from this session to govern in MongoDB Atlas.
   */
  static async extractSessionMemory(params: {
    transcript: string;
    telemetry: Telemetry;
    deliveryScore: number;
    contentScore: number;
  }): Promise<ExtractedMemoryDraft> {
    const { transcript, telemetry, contentScore } = params;

    const observations: string[] = [];
    let category: MemoryCategory = "delivery";

    if (telemetry.gazeOnCameraPct < 0.7) {
      observations.push("User frequently breaks camera eye-contact during technical explanations");
      category = "gaze";
    }
    if (telemetry.fillerWordCount >= 6) {
      observations.push(`User relies on verbal filler words (${telemetry.fillerWordCount} detected) when structuring thoughts`);
      category = "delivery";
    }
    if (telemetry.speakingRateWpm > 165) {
      observations.push("User accelerates speech beyond optimal cadence (>165 WPM)");
      category = "pacing";
    } else if (telemetry.speakingRateWpm < 120 && telemetry.speakingRateWpm > 0) {
      observations.push("User speaks at a hesitant pace below 120 WPM with prolonged pauses");
      category = "pacing";
    }
    if (contentScore < 35) {
      observations.push("Candidate struggles to provide concrete quantifiable outcomes in STAR responses");
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
      observation: "User demonstrated balanced delivery mechanics with steady eye contact and controlled pacing",
      confidenceScore: 0.88,
    };
  }

  private static getFallbackQuestions(targetRole: string): QuestionItem[] {
    return [
      {
        id: "q1",
        stage: 1,
        text: `Tell me about a technical project you led as a ${targetRole} and the primary architectural constraints.`,
        targetRubric: "TARGET: STAR FORMAT | ARCHITECTURE CONSTRAINTS & ROLE OWNERSHIP",
      },
      {
        id: "q2",
        stage: 2,
        text: "Describe how you diagnosed and mitigated a critical production incident or scaling bottleneck.",
        targetRubric: "TARGET: ROOT CAUSE ANALYSIS | METRICS & TELEMETRY OBSERVABILITY",
      },
      {
        id: "q3",
        stage: 3,
        text: "How do you resolve a contentious engineering tradeoff when stakeholders disagree on deadlines versus reliability?",
        targetRubric: "TARGET: STAKEHOLDER ALIGNMENT | BUSINESS VALUE & RISK MITIGATION",
      },
    ];
  }

  private static getFallbackContentEvaluation(transcript: string): ContentEvaluation {
    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    const baseScore = Math.min(52, Math.max(25, Math.round(wordCount * 0.4)));

    return {
      contentScore: baseScore,
      strengths: [
        "Structured narrative following situation and action sequence",
        "Direct engagement with technical domain concepts",
      ],
      growthAreas: [
        "Incorporate specific quantifiable benchmark metrics (e.g. latency, error rates)",
        "Elaborate on trade-off alternatives evaluated before implementation",
      ],
      rubricBreakdown: [
        { criterion: "STAR Structure", score: 12, feedback: "Clear situation framing." },
        { criterion: "Technical Substance", score: 14, feedback: "Specific technical details." },
        { criterion: "Quantifiable Metrics", score: 10, feedback: "Add percentage or latency figures." },
        { criterion: "Tradeoff Clarity", score: 10, feedback: "Highlight alternative decisions." },
      ],
    };
  }
}

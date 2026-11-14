import { NextResponse } from "next/server";
import { UsersRepository } from "@/lib/repositories/users.repository";
import { SessionsRepository } from "@/lib/repositories/sessions.repository";
import { MemoriesRepository } from "@/lib/repositories/memories.repository";
import { TelemetryRepository } from "@/lib/repositories/telemetry.repository";
import { FeedbackRepository } from "@/lib/repositories/feedback.repository";
import { DrillsRepository } from "@/lib/repositories/drills.repository";
import { generateEmbedding } from "@/lib/services/embeddings.service";

export async function POST() {
  const userId = "demo_speaker_1";
  const now = new Date();
  const pastSessionTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

  try {
    // 1. Ensure user
    await UsersRepository.upsertUser({
      userId,
      email: "demo@mirror.ai",
      name: "Demo Candidate",
      targetRole: "Senior AI / Software Engineer",
    });

    const session1Id = "ses_seed_baseline_01";

    // 2. Seed Baseline Session 1 (completed yesterday)
    await SessionsRepository.createSession({
      sessionId: session1Id,
      userId,
      targetRole: "Senior AI / Software Engineer",
      jobDescriptionText: "Lead distributed systems, low-latency microservices, and AI integrations.",
      resumeSummary: "8 years experience in backend services, cloud architecture, and database tuning.",
      questions: [
        {
          id: "q1",
          stage: 1,
          text: "Tell me about a time you resolved a high-severity production outage.",
          targetRubric: "TARGET: STAR FORMAT | LATENCY & INCIDENT METRICS",
        },
      ],
      status: "completed",
      totalDurationSeconds: 60,
      overallScore: 68,
    });

    // 3. Seed Session 1 Telemetry (poor eye contact, 12 fillers, rushed WPM)
    await TelemetryRepository.recordTelemetry({
      telemetryId: "tel_seed_baseline_01",
      sessionId: session1Id,
      userId,
      questionId: "q1",
      speakingRateWpm: 172, // Rushed
      fillerWordCount: 12,  // High fillers
      fillerBreakdown: { um: 7, like: 4, "you know": 1 },
      pauseCount: 6,
      gazeOnCameraPct: 0.58, // Poor eye contact
      durationSeconds: 60,
    });

    // 4. Seed Memory #M101 & #M102 in Atlas
    const obs1 = "User struggles with camera eye contact (58% lock) during technical incident explanations";
    const obs2 = "User exhibits high verbal filler frequency (12 fillers/min) when structuring architectural points";

    const [emb1, emb2] = await Promise.all([
      generateEmbedding(obs1),
      generateEmbedding(obs2),
    ]);

    const exp = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const mem1 = await MemoriesRepository.createMemory({
      memoryId: "mem_seed_gaze_01",
      userId,
      sourceSessionId: session1Id,
      derivedFromQuestionId: "q1",
      category: "gaze",
      observation: obs1,
      embedding: emb1,
      confidenceScore: 0.94,
      governanceStatus: "active",
      accessPolicy: "coach_only",
      expiresAt: exp,
    });

    const mem2 = await MemoriesRepository.createMemory({
      memoryId: "mem_seed_filler_02",
      userId,
      sourceSessionId: session1Id,
      derivedFromQuestionId: "q1",
      category: "delivery",
      observation: obs2,
      embedding: emb2,
      confidenceScore: 0.96,
      governanceStatus: "active",
      accessPolicy: "coach_only",
      expiresAt: exp,
    });

    // 5. Seed Feedback for Session 1
    await FeedbackRepository.createFeedback({
      feedbackId: "fb_seed_baseline_01",
      sessionId: session1Id,
      userId,
      questionId: "q1",
      transcript: "So basically, um, we had an outage, like, on the database cluster, and um, we had to sort of like restart Redis and, you know, it was really chaotic.",
      overallScore: 68,
      deliveryScore: 24, // Low delivery
      contentScore: 44,
      strengths: ["Clear recognition of database layer incident"],
      growthAreas: [
        "Eye contact slipped below 60%",
        "12 verbal fillers disrupted communication clarity",
      ],
      retrievedMemoryIds: [],
      memoryAttributionDelta: "Baseline assessment without prior memory.",
    });

    // 6. Seed Drill for Session 1
    await DrillsRepository.createDrill({
      drillId: "drill_seed_01",
      sessionId: session1Id,
      userId,
      title: "30s Gaze Stabilization Anchor",
      prompt: "Keep eyes firmly on the webcam aperture while summarizing your outage resolution in 3 sentences.",
      targetWeakness: "Camera gaze stability",
      governingMemoryId: mem1.memoryId,
      durationSeconds: 30,
    });

    return NextResponse.json({
      success: true,
      message: "Baseline demo history seeded successfully into MongoDB Atlas.",
      seeded: {
        sessionId: session1Id,
        memories: [mem1.memoryId, mem2.memoryId],
        summary: "Baseline established: 12 fillers, 58% gaze lock, 172 WPM. Session 2 will now show massive measurable improvement!",
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed demo data", details: String(error) },
      { status: 500 }
    );
  }
}

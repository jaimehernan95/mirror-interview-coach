import { NextRequest, NextResponse } from "next/server";
import { CoachAgentService } from "@/lib/services/coachAgent.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await req.json();

    const {
      userId = "demo_speaker_1",
      questionId = "q1",
      questionText = "Tell me about a challenging technical project you led.",
      targetRubric = "STAR format with quantifiable impact metrics",
      transcript = "",
      telemetryInput = {
        speakingRateWpm: 135,
        fillerWordCount: 2,
        fillerBreakdown: { um: 1, like: 1 },
        pauseCount: 2,
        gazeOnCameraPct: 0.85,
        durationSeconds: 60,
      },
    } = body;

    if (!transcript || !transcript.trim()) {
      return NextResponse.json(
        { error: "Transcript is required for answer analysis." },
        { status: 400 }
      );
    }

    const result = await CoachAgentService.processAnswer({
      sessionId,
      userId,
      questionId,
      questionText,
      targetRubric,
      transcript: transcript.trim(),
      telemetryInput,
    });

    return NextResponse.json(
      {
        success: true,
        sessionId,
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Session answer analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze interview answer." },
      { status: 500 }
    );
  }
}

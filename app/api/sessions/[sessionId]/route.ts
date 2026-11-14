import { NextRequest, NextResponse } from "next/server";
import { SessionsRepository } from "@/lib/repositories/sessions.repository";
import { FeedbackRepository } from "@/lib/repositories/feedback.repository";
import { DrillsRepository } from "@/lib/repositories/drills.repository";
import { TelemetryRepository } from "@/lib/repositories/telemetry.repository";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await SessionsRepository.findBySessionId(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    const [feedback, drills, telemetry, telemetrySummary] = await Promise.all([
      FeedbackRepository.findBySession(sessionId),
      DrillsRepository.findBySession(sessionId),
      TelemetryRepository.findBySession(sessionId),
      TelemetryRepository.getSessionSummary(sessionId),
    ]);

    const improvement = await TelemetryRepository.calculateImprovement(
      sessionId,
      session.userId
    );

    return NextResponse.json({
      success: true,
      session,
      feedback,
      drills,
      telemetry,
      telemetrySummary,
      improvement,
    });
  } catch (error) {
    console.error("Error retrieving session details:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session details." },
      { status: 500 }
    );
  }
}

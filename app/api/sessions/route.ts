import { NextRequest, NextResponse } from "next/server";
import { SessionsRepository } from "@/lib/repositories/sessions.repository";
import { UsersRepository } from "@/lib/repositories/users.repository";
import { TelemetryRepository } from "@/lib/repositories/telemetry.repository";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "demo_speaker_1";
    const limit = Number(searchParams.get("limit")) || 20;

    const sessions = await SessionsRepository.findByUser(userId, limit);

    // Attach summary telemetry to each session
    const sessionsWithSummaries = await Promise.all(
      sessions.map(async (s) => {
        const summary = await TelemetryRepository.getSessionSummary(s.sessionId);
        return {
          ...s,
          telemetrySummary: summary,
        };
      })
    );

    return NextResponse.json({
      success: true,
      userId,
      totalSessions: sessions.length,
      sessions: sessionsWithSummaries,
    });
  } catch (error) {
    console.error("Error retrieving sessions:", error);
    return NextResponse.json(
      { error: "Failed to retrieve sessions." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = "demo_speaker_1",
      targetRole = "Senior Full-Stack Engineer",
      jobDescriptionText = "",
      resumeSummary = "",
      questions = [],
    } = body;

    // Ensure user exists in Atlas
    await UsersRepository.upsertUser({
      userId,
      email: `${userId}@example.com`,
      name: userId.replace(/_/g, " ").toUpperCase(),
      targetRole,
    });

    const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newSession = await SessionsRepository.createSession({
      sessionId,
      userId,
      targetRole,
      jobDescriptionText,
      resumeSummary,
      questions,
      status: "in_progress",
    });

    return NextResponse.json(
      { success: true, session: newSession },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session." },
      { status: 500 }
    );
  }
}

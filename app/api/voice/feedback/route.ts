import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsService } from "@/lib/services/elevenlabs.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      wpm = 140,
      wpmDelta,
      fillerCount = 2,
      fillerReductionPct,
      gazePct = 85,
      growthArea,
      voiceId,
    } = body;

    // Compose script if not explicitly provided
    const spokenScript =
      text ||
      ElevenLabsService.composeSpokenFeedbackScript({
        wpm,
        wpmDelta,
        fillerCount,
        fillerReductionPct,
        gazePct,
        growthArea,
      });

    const result = await ElevenLabsService.generateCoachVoice(spokenScript, voiceId);

    if (result.fallback || !result.audioBuffer) {
      return NextResponse.json({
        success: true,
        fallback: true,
        script: spokenScript,
        message: result.message || "Using client-side speech synthesis.",
      });
    }

    // Convert Buffer to Uint8Array for Next.js response compatibility
    const uint8Array = new Uint8Array(result.audioBuffer);

    return new Response(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": uint8Array.byteLength.toString(),
        "X-Spoken-Script": encodeURIComponent(spokenScript),
      },
    });
  } catch (error: any) {
    console.error("ElevenLabs route error:", error);
    return NextResponse.json(
      { error: "Failed to generate spoken voice feedback.", details: error.message },
      { status: 500 }
    );
  }
}

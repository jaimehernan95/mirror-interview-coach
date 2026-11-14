import { NextRequest, NextResponse } from "next/server";
import { GeminiService } from "@/lib/services/gemini.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetRole, jobDescription, resumeText, count = 3 } = body;

    if (!targetRole || typeof targetRole !== "string") {
      return NextResponse.json(
        { error: "Target role is required." },
        { status: 400 }
      );
    }

    const questions = await GeminiService.generateQuestions({
      targetRole,
      jobDescription,
      resumeText,
      count: Number(count) || 3,
    });

    return NextResponse.json({ success: true, questions }, { status: 200 });
  } catch (error) {
    console.error("Error generating interview questions:", error);
    return NextResponse.json(
      { error: "Failed to generate interview questions." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { extractResumeText } from "@/lib/utils/resumeExtractor";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("text") as string | null;

    if (rawText && rawText.trim()) {
      return NextResponse.json({
        success: true,
        extractedText: rawText.trim().slice(0, 5000),
      });
    }

    if (!file) {
      return NextResponse.json(
        { error: "No file or text payload provided." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extractedText = await extractResumeText(buffer, file.name);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      extractedText,
    });
  } catch (error) {
    console.error("Resume parsing error:", error);
    return NextResponse.json(
      { error: "Failed to process resume file." },
      { status: 500 }
    );
  }
}

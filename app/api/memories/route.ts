import { NextRequest, NextResponse } from "next/server";
import { MemoriesRepository } from "@/lib/repositories/memories.repository";
import { generateEmbedding } from "@/lib/services/embeddings.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "demo_speaker_1";
    const all = searchParams.get("all") === "true";

    const memories = all
      ? await MemoriesRepository.listAllMemories(userId)
      : await MemoriesRepository.listActiveMemories(userId);

    return NextResponse.json({
      success: true,
      userId,
      count: memories.length,
      memories,
    });
  } catch (error) {
    console.error("Error retrieving governed memories:", error);
    return NextResponse.json(
      { error: "Failed to retrieve memories." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = "demo_speaker_1",
      observation,
      category = "delivery",
      sourceSessionId = "manual_seed",
    } = body;

    if (!observation || !observation.trim()) {
      return NextResponse.json(
        { error: "Observation text is required." },
        { status: 400 }
      );
    }

    const embedding = await generateEmbedding(observation);
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Set TTL expiration to 60 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    const memory = await MemoriesRepository.createMemory({
      memoryId,
      userId,
      sourceSessionId,
      category,
      observation: observation.trim(),
      embedding,
      confidenceScore: 0.95,
      governanceStatus: "active",
      accessPolicy: "coach_only",
      expiresAt,
    });

    return NextResponse.json({ success: true, memory }, { status: 201 });
  } catch (error) {
    console.error("Error creating memory:", error);
    return NextResponse.json(
      { error: "Failed to create memory." },
      { status: 500 }
    );
  }
}

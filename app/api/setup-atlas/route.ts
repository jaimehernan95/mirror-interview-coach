import { NextResponse } from "next/server";
import {
  ensureAtlasIndexes,
  checkVectorSearchIndexStatus,
  createProgrammaticVectorIndex,
  ATLAS_VECTOR_SEARCH_INDEX_DEFINITION,
} from "@/lib/db/atlasIndexes";
import { getDatabase } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });

    const vectorStatus = await checkVectorSearchIndexStatus();

    return NextResponse.json({
      status: "healthy",
      database: db.databaseName,
      message: "Connected to MongoDB Atlas cluster.",
      vectorSearchStatus: vectorStatus,
      requiredIndexDefinition: ATLAS_VECTOR_SEARCH_INDEX_DEFINITION,
      atlasUiInstructions: {
        step1: "Log into cloud.mongodb.com and open Cluster0",
        step2: "Click 'Search & Vector Search' (or 'Atlas Search')",
        step3: "Click 'Create Search Index' -> 'Atlas Vector Search' -> 'JSON Editor'",
        step4: "Select database 'interview_coach' and collection 'memories'",
        step5: "Name the index 'vector_index' and paste requiredIndexDefinition",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "degraded",
        error: error.message || String(error),
        message: "MongoDB Atlas connection failed. Verify MONGODB_URI in .env.local",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const standardIndexes = await ensureAtlasIndexes();
    const programmaticResult = await createProgrammaticVectorIndex();
    const vectorStatus = await checkVectorSearchIndexStatus();

    return NextResponse.json({
      success: true,
      standardIndexes: standardIndexes.created,
      programmaticVectorIndexAttempt: programmaticResult,
      currentVectorIndexStatus: vectorStatus,
      requiredIndexDefinition: ATLAS_VECTOR_SEARCH_INDEX_DEFINITION,
    });
  } catch (error: any) {
    console.error("Atlas index setup error:", error);
    return NextResponse.json(
      { error: "Failed to setup Atlas indexes", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

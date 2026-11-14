import { NextResponse } from "next/server";
import { ensureAtlasIndexes, ATLAS_VECTOR_SEARCH_INDEX_DEFINITION } from "@/lib/db/atlasIndexes";
import { getDatabase } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });

    return NextResponse.json({
      status: "healthy",
      database: db.databaseName,
      message: "Connected to MongoDB Atlas successfully.",
      vectorIndexConfig: ATLAS_VECTOR_SEARCH_INDEX_DEFINITION,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        error: String(error),
        message: "FastAPI / Next.js is running, but MongoDB Atlas is unreachable. Verify MONGODB_URI in .env.local",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await ensureAtlasIndexes();
    return NextResponse.json({
      success: true,
      message: "MongoDB Atlas indexes initialized successfully.",
      createdIndexes: result.created,
      vectorSearchDefinition: ATLAS_VECTOR_SEARCH_INDEX_DEFINITION,
    });
  } catch (error) {
    console.error("Atlas index setup error:", error);
    return NextResponse.json(
      { error: "Failed to create Atlas indexes", details: String(error) },
      { status: 500 }
    );
  }
}

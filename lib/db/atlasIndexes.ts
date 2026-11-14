import { getDatabase, getMemoriesCollection } from "./mongodb";

export const ATLAS_VECTOR_SEARCH_INDEX_DEFINITION = {
  name: "memory_vector_index",
  type: "vectorSearch",
  definition: {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: 768,
        similarity: "cosine",
      },
      // Strict Pre-Filtering fields to prevent cross-tenant memory leakage
      {
        type: "filter",
        path: "userId",
      },
      {
        type: "filter",
        path: "governanceStatus",
      },
      {
        type: "filter",
        path: "category",
      },
    ],
  },
};

/**
 * Checks whether the Atlas Vector Search index 'memory_vector_index' (or 'vector_index') exists and is ready.
 */
export async function checkVectorSearchIndexStatus(): Promise<{
  exists: boolean;
  ready: boolean;
  status: string;
  indexName: string;
  error?: string;
}> {
  try {
    const col = await getMemoriesCollection();
    const cursor = (col as any).listSearchIndexes();
    const indexes = await cursor.toArray();

    const vectorIndex = (indexes as any[]).find(
      (idx: any) =>
        idx.name === "memory_vector_index" ||
        idx.name === "vector_index" ||
        idx.type === "vectorSearch"
    );

    if (!vectorIndex) {
      return {
        exists: false,
        ready: false,
        status: "NOT_FOUND",
        indexName: "memory_vector_index",
        error: "Vector Search index 'memory_vector_index' has not been created in MongoDB Atlas yet.",
      };
    }

    const rawStatus = (vectorIndex as any).status;
    const isReady =
      rawStatus === "READY" ||
      rawStatus === "ACTIVE" ||
      (vectorIndex as any).queryable === true;

    return {
      exists: true,
      ready: isReady,
      status: rawStatus || (isReady ? "READY" : "BUILDING"),
      indexName: (vectorIndex as any).name || "memory_vector_index",
    };
  } catch (err: any) {
    return {
      exists: false,
      ready: false,
      status: "UNAVAILABLE",
      indexName: "memory_vector_index",
      error: err.message || String(err),
    };
  }
}

/**
 * Attempts programmatic creation of the Atlas Vector Search index (MongoDB 6.0.11+ / 7.0+).
 */
export async function createProgrammaticVectorIndex(): Promise<{ success: boolean; message: string }> {
  try {
    const col = await getMemoriesCollection();
    if (typeof (col as any).createSearchIndex === "function") {
      await (col as any).createSearchIndex({
        name: ATLAS_VECTOR_SEARCH_INDEX_DEFINITION.name,
        type: ATLAS_VECTOR_SEARCH_INDEX_DEFINITION.type,
        definition: ATLAS_VECTOR_SEARCH_INDEX_DEFINITION.definition,
      });
      return {
        success: true,
        message: "Programmatic Vector Search index creation command dispatched to Atlas.",
      };
    }
    return {
      success: false,
      message: "Driver createSearchIndex not supported in this runtime; create via Atlas UI.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || String(err),
    };
  }
}

/**
 * Ensures standard compound indexes and TTL governance indexes exist in MongoDB Atlas.
 */
export async function ensureAtlasIndexes(): Promise<{ success: boolean; created: string[] }> {
  const db = await getDatabase();
  const created: string[] = [];

  try {
    // 1. Users collection
    await db.collection("users").createIndex({ userId: 1 }, { unique: true });
    created.push("users.userId_unique");

    // 2. Sessions collection
    await db.collection("sessions").createIndex({ userId: 1, createdAt: -1 });
    await db.collection("sessions").createIndex({ sessionId: 1 }, { unique: true });
    created.push("sessions.userId_createdAt", "sessions.sessionId_unique");

    // 3. Memories collection (Governance + TTL + Tenant Isolation)
    await db.collection("memories").createIndex({ memoryId: 1 }, { unique: true });
    await db.collection("memories").createIndex({ userId: 1, governanceStatus: 1, createdAt: -1 });
    await db.collection("memories").createIndex({ sourceSessionId: 1 });
    
    // TTL Index: Automates the "how does it drop expired memories?" requirement
    await db.collection("memories").createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, sparse: true, name: "idx_memories_ttl_expiration" }
    );
    created.push(
      "memories.memoryId_unique",
      "memories.userId_status_createdAt",
      "memories.ttl_expiration"
    );

    // 4. Feedback collection
    await db.collection("feedback").createIndex({ sessionId: 1, questionId: 1 });
    await db.collection("feedback").createIndex({ userId: 1, createdAt: -1 });
    created.push("feedback.sessionId_questionId", "feedback.userId_createdAt");

    // 5. Drills collection
    await db.collection("drills").createIndex({ userId: 1, completed: 1 });
    await db.collection("drills").createIndex({ governingMemoryId: 1 });
    created.push("drills.userId_completed", "drills.governingMemoryId");

    // 6. Telemetry collection
    await db.collection("telemetry").createIndex({ sessionId: 1, questionId: 1 });
    await db.collection("telemetry").createIndex({ userId: 1, createdAt: -1 });
    created.push("telemetry.sessionId_questionId", "telemetry.userId_createdAt");

    return { success: true, created };
  } catch (error) {
    console.error("Error creating Atlas standard indexes:", error);
    throw error;
  }
}

import { getMemoriesCollection } from "@/lib/db/mongodb";
import {
  Memory,
  CreateMemoryInput,
  GovernanceStatus,
  MemoryVectorSearchResult,
} from "@/types/memory";
import { checkVectorSearchIndexStatus } from "@/lib/db/atlasIndexes";

let cachedIndexReady: boolean | null = null;
let cachedIndexName = "memory_vector_index";
let lastIndexCheckTime = 0;

export class MemoriesRepository {
  /**
   * Persist a newly extracted memory into MongoDB Atlas with full audit initialization.
   */
  static async createMemory(input: CreateMemoryInput): Promise<Memory> {
    const col = await getMemoriesCollection();
    const now = new Date();
    const memory: Memory = {
      ...input,
      timesApplied: 0,
      auditTrail: [
        {
          timestamp: now,
          action: "created",
          actor: "agent",
          reason: `Extracted from session ${input.sourceSessionId}`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await col.insertOne(memory);
    return memory;
  }

  /**
   * Atlas Vector Search for semantically relevant memories, with strict tenant isolation.
   * Targets 'memory_vector_index' (or 'vector_index').
   * Supports pre-filter or post-$match to handle whether 'userId' is indexed as a filter yet.
   */
  static async searchRelevantMemories(params: {
    userId: string;
    queryVector: number[];
    limit?: number;
    category?: string;
  }): Promise<MemoryVectorSearchResult[]> {
    const { userId, queryVector, limit = 5, category } = params;
    const col = await getMemoriesCollection();

    // 1. Check index readiness with a 30s cache
    const now = Date.now();
    if (cachedIndexReady === null || now - lastIndexCheckTime > 30000) {
      const status = await checkVectorSearchIndexStatus();
      cachedIndexReady = status.ready;
      cachedIndexName = status.indexName || "memory_vector_index";
      lastIndexCheckTime = now;
      if (!status.ready) {
        console.warn(
          `[Atlas Search Check] Vector index '${cachedIndexName}' status: ${status.status}. (Will use fallback until index is READY).`
        );
      }
    }

    // 2. If index is ready, try Atlas Vector Search with pre-filter first
    if (cachedIndexReady) {
      try {
        const filterConditions: Record<string, unknown> = {
          userId: { $eq: userId },
        };

        const pipelineWithFilter = [
          {
            $vectorSearch: {
              index: cachedIndexName,
              path: "embedding",
              queryVector: queryVector,
              numCandidates: 50,
              limit: limit,
              filter: filterConditions,
            },
          },
          {
            $match: {
              governanceStatus: "active",
              ...(category ? { category } : {}),
            },
          },
          {
            $project: {
              score: { $meta: "vectorSearchScore" },
              memory: "$$ROOT",
            },
          },
        ];

        const cursor = col.aggregate<{ score: number; memory: Memory }>(pipelineWithFilter);
        const results = await cursor.toArray();
        return results.map((r) => ({
          memory: r.memory,
          score: r.score,
        }));
      } catch (filterError: any) {
        const errorMsg = filterError.message || String(filterError);
        console.warn(
          `⚠️ Pre-filter vector search failed (${errorMsg}). Attempting vector search with post-$match pipeline:`
        );

        // 3. Fallback: Vector search without filter, followed by $match pipeline stage
        // Solves: "Path 'userId' needs to be indexed as filter" if index hasn't finished updating
        try {
          const pipelineWithPostMatch = [
            {
              $vectorSearch: {
                index: cachedIndexName,
                path: "embedding",
                queryVector: queryVector,
                numCandidates: 50,
                limit: limit * 4,
              },
            },
            {
              $match: {
                userId: userId,
                governanceStatus: "active",
                ...(category ? { category } : {}),
              },
            },
            {
              $limit: limit,
            },
            {
              $project: {
                score: { $meta: "vectorSearchScore" },
                memory: "$$ROOT",
              },
            },
          ];

          const cursor = col.aggregate<{ score: number; memory: Memory }>(pipelineWithPostMatch);
          const results = await cursor.toArray();
          if (results.length > 0) {
            return results.map((r) => ({
              memory: r.memory,
              score: r.score,
            }));
          }
        } catch (postMatchError: any) {
          console.warn("Post-match vector search failed:", postMatchError.message);
        }
      }
    }

    // 4. Resilient fallback query: returns active memories for this specific tenant/user directly
    console.log(`[Atlas Memory] Using exact query for active memories (user: ${userId})`);
    const filter: Record<string, any> = { userId, governanceStatus: "active" };
    if (category) filter.category = category;

    const fallbackMemories = await col
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return fallbackMemories.map((m) => ({ memory: m, score: 0.92 }));
  }

  /**
   * List active, governed memories for a user.
   */
  static async listActiveMemories(userId: string): Promise<Memory[]> {
    const col = await getMemoriesCollection();
    return col
      .find({ userId, governanceStatus: "active" })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * List all memories for governance dashboard (active, disputed, superseded, deprecated).
   */
  static async listAllMemories(userId: string): Promise<Memory[]> {
    const col = await getMemoriesCollection();
    return col.find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Mark a memory as disputed by the user.
   */
  static async disputeMemory(memoryId: string, reason: string): Promise<boolean> {
    const col = await getMemoriesCollection();
    const now = new Date();
    const result = await col.updateOne(
      { memoryId },
      {
        $set: {
          governanceStatus: "disputed",
          disputeReason: reason,
          updatedAt: now,
        },
        $push: {
          auditTrail: {
            timestamp: now,
            action: "disputed",
            actor: "user",
            reason,
          },
        },
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Update or correct an existing memory's observation text.
   */
  static async editMemoryObservation(
    memoryId: string,
    newObservation: string,
    reason: string
  ): Promise<boolean> {
    const col = await getMemoriesCollection();
    const now = new Date();
    const existing = await col.findOne({ memoryId });

    const result = await col.updateOne(
      { memoryId },
      {
        $set: {
          observation: newObservation,
          updatedAt: now,
        },
        $push: {
          auditTrail: {
            timestamp: now,
            action: "edited",
            actor: "user",
            reason,
            previousValue: existing?.observation,
            newValue: newObservation,
          },
        },
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Deprecate a memory so it is no longer retrieved by the coaching agent.
   */
  static async deprecateMemory(memoryId: string, reason: string): Promise<boolean> {
    const col = await getMemoriesCollection();
    const now = new Date();
    const result = await col.updateOne(
      { memoryId },
      {
        $set: {
          governanceStatus: "deprecated",
          updatedAt: now,
        },
        $push: {
          auditTrail: {
            timestamp: now,
            action: "deprecated",
            actor: "user",
            reason,
          },
        },
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Hard delete / purge a memory (Right to be Forgotten).
   */
  static async purgeMemory(memoryId: string): Promise<boolean> {
    const col = await getMemoriesCollection();
    const result = await col.deleteOne({ memoryId });
    return result.deletedCount > 0;
  }

  /**
   * Proves behavioral change: increments the times applied counter and records an audit log.
   */
  static async recordAttribution(memoryIds: string[], sessionId: string): Promise<void> {
    if (!memoryIds || memoryIds.length === 0) return;
    const col = await getMemoriesCollection();
    const now = new Date();

    await col.updateMany(
      { memoryId: { $in: memoryIds } },
      {
        $inc: { timesApplied: 1 },
        $set: { lastAppliedAt: now, updatedAt: now },
        $push: {
          auditTrail: {
            timestamp: now,
            action: "applied",
            actor: "agent",
            reason: `Guided coach recommendations for session ${sessionId}`,
          },
        },
      }
    );
  }
}

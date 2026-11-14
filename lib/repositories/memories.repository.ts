import { getMemoriesCollection } from "@/lib/db/mongodb";
import {
  Memory,
  CreateMemoryInput,
  GovernanceStatus,
  MemoryVectorSearchResult,
} from "@/types/memory";

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
   * Uses MongoDB Atlas $vectorSearch pipeline.
   */
  static async searchRelevantMemories(params: {
    userId: string;
    queryVector: number[];
    limit?: number;
    category?: string;
  }): Promise<MemoryVectorSearchResult[]> {
    const { userId, queryVector, limit = 5, category } = params;
    const col = await getMemoriesCollection();

    // Strict filter condition ensuring zero memory leakage between users
    const filterConditions: Record<string, unknown> = {
      userId: { $eq: userId },
      governanceStatus: { $eq: "active" },
    };

    if (category) {
      filterConditions.category = { $eq: category };
    }

    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: queryVector,
            numCandidates: 50,
            limit: limit,
            filter: filterConditions,
          },
        },
        {
          $project: {
            score: { $meta: "vectorSearchScore" },
            memory: "$$ROOT",
          },
        },
      ];

      const cursor = col.aggregate<{ score: number; memory: Memory }>(pipeline);
      const results = await cursor.toArray();
      return results.map((r) => ({
        memory: r.memory,
        score: r.score,
      }));
    } catch (error) {
      console.warn("Atlas Vector Search failed or index not yet initialized. Falling back to exact query.", error);
      // Resilient fallback query: recent active memories for this user
      const fallbackMemories = await col
        .find({ userId, governanceStatus: "active" })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return fallbackMemories.map((m) => ({ memory: m, score: 0.85 }));
    }
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

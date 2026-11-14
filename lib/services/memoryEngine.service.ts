import { MemoriesRepository } from "@/lib/repositories/memories.repository";
import { Memory } from "@/types/memory";
import { generateEmbedding } from "./embeddings.service";
import { LangSmithService } from "./langsmith.service";

export interface GovernedMemoryContext {
  retrievedMemories: Memory[];
  retrievedMemoryIds: string[];
  attributionProof: string;
  hasGazeHistory: boolean;
  hasFillerHistory: boolean;
  hasPacingHistory: boolean;
}

export class MemoryEngineService {
  /**
   * Retrieves relevant, governed active memories from MongoDB Atlas via Vector Search.
   * Guarantees strict user isolation and ignores disputed/deprecated/expired memories.
   */
  static async retrieveGovernedMemories(params: {
    userId: string;
    contextText: string;
    limit?: number;
  }): Promise<GovernedMemoryContext> {
    const { userId, contextText, limit = 4 } = params;

    return LangSmithService.traceExecution(
      "retrieve-governed-memories",
      "retriever",
      { userId, limit },
      async () => {
        // 1. Generate query embedding for Atlas Vector Search
        const queryVector = await generateEmbedding(contextText);

        // 2. Perform Atlas Vector Search with strict tenant pre-filtering
        const searchResults = await MemoriesRepository.searchRelevantMemories({
          userId,
          queryVector,
          limit,
        });

        const now = new Date();
        // 3. Filter out any expired memories that haven't yet been purged by the TTL daemon
        const validMemories = searchResults
          .map((r) => r.memory)
          .filter((m) => {
            if (m.governanceStatus !== "active") return false;
            if (m.expiresAt && new Date(m.expiresAt) < now) return false;
            return true;
          });

        const retrievedMemoryIds = validMemories.map((m) => m.memoryId);

        // Analyze specific recurring patterns from memory
        const observationsCombined = validMemories.map((m) => m.observation.toLowerCase()).join(" ");
        const hasGazeHistory = observationsCombined.includes("eye") || observationsCombined.includes("gaze");
        const hasFillerHistory = observationsCombined.includes("filler") || observationsCombined.includes("verbal");
        const hasPacingHistory = observationsCombined.includes("pacing") || observationsCombined.includes("cadence") || observationsCombined.includes("wpm");

        // 4. Synthesize Behavioral Attribution Proof (Hackathon Statement Two)
        let attributionProof = "Baseline Coaching: Standard pacing and structure recommendations.";
        if (validMemories.length > 0) {
          const reasons: string[] = [];
          if (hasGazeHistory) {
            reasons.push("Prioritized Eye Contact Stability Drill based on persistent gaze drift memory");
          }
          if (hasFillerHistory) {
            reasons.push("Substituted generic advice with a 30s Intentional Pause Drill to target historical filler patterns");
          }
          if (hasPacingHistory) {
            reasons.push("Calibrated delivery tempo targets to counteract historical speech rush");
          }
          if (reasons.length === 0) {
            reasons.push(`Adapted drill selection targeting memory: "${validMemories[0].observation}"`);
          }
          attributionProof = `Memory-Governed Adaptation: ${reasons.join("; ")}. (Informed by memories: [${retrievedMemoryIds.join(", ")}])`;
        }

        return {
          retrievedMemories: validMemories,
          retrievedMemoryIds,
          attributionProof,
          hasGazeHistory,
          hasFillerHistory,
          hasPacingHistory,
        };
      }
    );
  }
}

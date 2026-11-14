import { ObjectId } from "mongodb";

export type MemoryCategory = "delivery" | "content" | "pacing" | "gaze" | "structural";

export type GovernanceStatus = "active" | "disputed" | "superseded" | "deprecated";

export type AccessPolicy = "private" | "coach_only" | "team_shared";

export interface MemoryAuditRecord {
  timestamp: Date;
  action: "created" | "applied" | "disputed" | "edited" | "superseded" | "deprecated" | "purged";
  actor: "agent" | "user" | "policy_evaluator";
  reason?: string;
  previousValue?: string;
  newValue?: string;
}

export interface Memory {
  _id?: ObjectId;
  memoryId: string;
  userId: string;                         // Tenant / user scoping (Strict Isolation)
  orgId?: string;
  sourceSessionId: string;                // Provenance: Which session gave birth to this memory
  derivedFromQuestionId?: string;
  category: MemoryCategory;
  observation: string;                    // E.g. "User struggles with eye contact and filler words"
  embedding?: number[];                   // 768-dim vector for Atlas Vector Search
  confidenceScore: number;                // 0.0 to 1.0
  governanceStatus: GovernanceStatus;     // active | disputed | superseded | deprecated
  accessPolicy: AccessPolicy;
  supersededBy?: string;                  // Pointer to newer memoryId if updated
  disputeReason?: string;
  timesApplied: number;                   // Behavioral proof: times used to adapt coaching
  lastAppliedAt?: Date;
  auditTrail: MemoryAuditRecord[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;                       // TTL index field: automatic forgetting policy
}

export interface MemoryVectorSearchResult {
  memory: Memory;
  score: number;                          // Cosine similarity score
}

export type CreateMemoryInput = Omit<
  Memory,
  "_id" | "timesApplied" | "auditTrail" | "createdAt" | "updatedAt"
>;

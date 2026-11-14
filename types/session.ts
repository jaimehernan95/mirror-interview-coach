import { ObjectId } from "mongodb";

export interface QuestionItem {
  id: string;
  text: string;
  targetRubric: string;
  stage: number; // E.g., 1 for warm-up, 2 for deep-dive, 3 for behavioral/tradeoff
}

export interface Session {
  _id?: ObjectId;
  sessionId: string;
  userId: string;
  orgId?: string;
  targetRole: string;
  jobDescriptionText?: string;
  resumeSummary?: string;
  questions: QuestionItem[];
  status: "in_progress" | "completed" | "abandoned";
  totalDurationSeconds?: number;
  overallScore?: number;
  createdAt: Date;
  completedAt?: Date;
}

export type CreateSessionInput = Omit<Session, "_id" | "createdAt">;

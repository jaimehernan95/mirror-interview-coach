import { ObjectId } from "mongodb";

export interface ContentRubricScore {
  criterion: string;
  score: number; // 0 to 10
  feedback: string;
}

export interface Feedback {
  _id?: ObjectId;
  feedbackId: string;
  sessionId: string;
  userId: string;
  questionId: string;
  transcript: string;
  overallScore: number;                 // 0 to 100
  deliveryScore: number;                // 0 to 40
  contentScore: number;                 // 0 to 60
  strengths: string[];
  growthAreas: string[];
  rubricBreakdown?: ContentRubricScore[];
  // Statement Two: Proving memory changed agent behavior
  retrievedMemoryIds: string[];         // Memory IDs retrieved via Atlas Vector Search
  memoryAttributionDelta: string;       // Counterfactual explanation: what the coach did differently
  createdAt: Date;
}

export type CreateFeedbackInput = Omit<Feedback, "_id" | "createdAt">;

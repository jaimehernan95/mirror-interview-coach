import { ObjectId } from "mongodb";

export interface Drill {
  _id?: ObjectId;
  drillId: string;
  sessionId: string;
  userId: string;
  title: string;
  prompt: string;
  targetWeakness: string;
  governingMemoryId?: string; // Links this drill directly to the governed memory that mandated it
  durationSeconds: number;    // Usually 30s micro-drills
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}

export type CreateDrillInput = Omit<Drill, "_id" | "completed" | "completedAt" | "createdAt">;

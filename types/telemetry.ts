import { ObjectId } from "mongodb";

export interface Telemetry {
  _id?: ObjectId;
  telemetryId: string;
  sessionId: string;
  userId: string;
  questionId: string;
  speakingRateWpm: number;
  fillerWordCount: number;
  fillerBreakdown: Record<string, number>;
  pauseCount: number;
  longPauseDurationSeconds?: number;
  gazeOnCameraPct: number;    // 0.0 to 1.0
  headStabilityPct?: number;   // 0.0 to 1.0
  audioPitchHz?: number;
  durationSeconds: number;
  createdAt: Date;
}

export type CreateTelemetryInput = Omit<Telemetry, "_id" | "createdAt">;

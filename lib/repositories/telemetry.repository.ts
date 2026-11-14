import { getTelemetryCollection } from "@/lib/db/mongodb";
import { Telemetry, CreateTelemetryInput } from "@/types/telemetry";

export interface SessionTelemetrySummary {
  sessionId: string;
  avgWpm: number;
  totalFillers: number;
  avgGazePct: number;
  avgPauses: number;
  questionCount: number;
  createdAt: Date;
}

export class TelemetryRepository {
  static async recordTelemetry(input: CreateTelemetryInput): Promise<Telemetry> {
    const col = await getTelemetryCollection();
    const telemetry: Telemetry = {
      ...input,
      createdAt: new Date(),
    };
    await col.insertOne(telemetry);
    return telemetry;
  }

  static async findBySession(sessionId: string): Promise<Telemetry[]> {
    const col = await getTelemetryCollection();
    return col.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  }

  /**
   * Aggregates telemetry across all questions in a session.
   */
  static async getSessionSummary(sessionId: string): Promise<SessionTelemetrySummary | null> {
    const records = await this.findBySession(sessionId);
    if (!records.length) return null;

    const count = records.length;
    const avgWpm = Math.round(records.reduce((acc, r) => acc + r.speakingRateWpm, 0) / count);
    const totalFillers = records.reduce((acc, r) => acc + r.fillerWordCount, 0);
    const avgGazePct =
      Math.round((records.reduce((acc, r) => acc + r.gazeOnCameraPct, 0) / count) * 100) / 100;
    const avgPauses = Math.round((records.reduce((acc, r) => acc + r.pauseCount, 0) / count) * 10) / 10;

    return {
      sessionId,
      avgWpm,
      totalFillers,
      avgGazePct,
      avgPauses,
      questionCount: count,
      createdAt: records[0].createdAt,
    };
  }

  /**
   * Calculates measurable improvement between the current session and previous session.
   */
  static async calculateImprovement(
    currentSessionId: string,
    userId: string
  ): Promise<{
    hasPrevious: boolean;
    wpmDelta: number;
    fillerReductionPct: number;
    gazeDeltaPct: number;
    summaryText: string;
  }> {
    const col = await getTelemetryCollection();

    // Get distinct sessionIds for this user, sorted by recency
    const recentTelemetries = await col
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const sessionIds = Array.from(new Set(recentTelemetries.map((t) => t.sessionId)));
    const currentIdx = sessionIds.indexOf(currentSessionId);

    if (currentIdx === -1 || currentIdx >= sessionIds.length - 1) {
      return {
        hasPrevious: false,
        wpmDelta: 0,
        fillerReductionPct: 0,
        gazeDeltaPct: 0,
        summaryText: "First recorded session. Baseline telemetry established.",
      };
    }

    const previousSessionId = sessionIds[currentIdx + 1];
    const currentSummary = await this.getSessionSummary(currentSessionId);
    const previousSummary = await this.getSessionSummary(previousSessionId);

    if (!currentSummary || !previousSummary) {
      return {
        hasPrevious: false,
        wpmDelta: 0,
        fillerReductionPct: 0,
        gazeDeltaPct: 0,
        summaryText: "Insufficient telemetry history.",
      };
    }

    const wpmDelta = currentSummary.avgWpm - previousSummary.avgWpm;
    const fillerDiff = previousSummary.totalFillers - currentSummary.totalFillers;
    const fillerReductionPct =
      previousSummary.totalFillers > 0
        ? Math.round((fillerDiff / previousSummary.totalFillers) * 100)
        : 0;
    const gazeDeltaPct = Math.round((currentSummary.avgGazePct - previousSummary.avgGazePct) * 100);

    const summaryParts: string[] = [];
    if (fillerReductionPct > 0) {
      summaryParts.push(`Fillers dropped by ${fillerReductionPct}% (${previousSummary.totalFillers} -> ${currentSummary.totalFillers})`);
    } else if (fillerReductionPct < 0) {
      summaryParts.push(`Fillers increased by ${Math.abs(fillerReductionPct)}%`);
    }

    if (gazeDeltaPct > 0) {
      summaryParts.push(`Camera gaze lock improved by +${gazeDeltaPct}%`);
    }

    summaryParts.push(`Pace: ${currentSummary.avgWpm} WPM (prior: ${previousSummary.avgWpm} WPM)`);

    return {
      hasPrevious: true,
      wpmDelta,
      fillerReductionPct,
      gazeDeltaPct,
      summaryText: summaryParts.join(" • "),
    };
  }
}

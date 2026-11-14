import { getSessionsCollection } from "@/lib/db/mongodb";
import { Session, CreateSessionInput } from "@/types/session";

export class SessionsRepository {
  static async createSession(input: CreateSessionInput): Promise<Session> {
    const col = await getSessionsCollection();
    const session: Session = {
      ...input,
      createdAt: new Date(),
    };
    await col.insertOne(session);
    return session;
  }

  static async findBySessionId(sessionId: string): Promise<Session | null> {
    const col = await getSessionsCollection();
    return col.findOne({ sessionId });
  }

  static async findByUser(userId: string, limit: number = 20): Promise<Session[]> {
    const col = await getSessionsCollection();
    return col.find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray();
  }

  static async completeSession(
    sessionId: string,
    overallScore: number,
    totalDurationSeconds?: number
  ): Promise<boolean> {
    const col = await getSessionsCollection();
    const result = await col.updateOne(
      { sessionId },
      {
        $set: {
          status: "completed",
          overallScore,
          totalDurationSeconds,
          completedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  static async countUserSessions(userId: string): Promise<number> {
    const col = await getSessionsCollection();
    return col.countDocuments({ userId });
  }
}

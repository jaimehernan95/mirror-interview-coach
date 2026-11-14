import { getFeedbackCollection } from "@/lib/db/mongodb";
import { Feedback, CreateFeedbackInput } from "@/types/feedback";

export class FeedbackRepository {
  static async createFeedback(input: CreateFeedbackInput): Promise<Feedback> {
    const col = await getFeedbackCollection();
    const feedback: Feedback = {
      ...input,
      createdAt: new Date(),
    };
    await col.insertOne(feedback);
    return feedback;
  }

  static async findBySession(sessionId: string): Promise<Feedback[]> {
    const col = await getFeedbackCollection();
    return col.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  }

  static async findByUser(userId: string, limit: number = 20): Promise<Feedback[]> {
    const col = await getFeedbackCollection();
    return col.find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray();
  }
}

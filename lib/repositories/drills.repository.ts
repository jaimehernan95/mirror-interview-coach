import { getDrillsCollection } from "@/lib/db/mongodb";
import { Drill, CreateDrillInput } from "@/types/drill";

export class DrillsRepository {
  static async createDrill(input: CreateDrillInput): Promise<Drill> {
    const col = await getDrillsCollection();
    const drill: Drill = {
      ...input,
      completed: false,
      createdAt: new Date(),
    };
    await col.insertOne(drill);
    return drill;
  }

  static async createMultipleDrills(inputs: CreateDrillInput[]): Promise<Drill[]> {
    if (!inputs.length) return [];
    const col = await getDrillsCollection();
    const now = new Date();
    const drills: Drill[] = inputs.map((input) => ({
      ...input,
      completed: false,
      createdAt: now,
    }));
    await col.insertMany(drills);
    return drills;
  }

  static async findBySession(sessionId: string): Promise<Drill[]> {
    const col = await getDrillsCollection();
    return col.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  }

  static async findByUser(userId: string, limit: number = 20): Promise<Drill[]> {
    const col = await getDrillsCollection();
    return col.find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray();
  }

  static async completeDrill(drillId: string): Promise<boolean> {
    const col = await getDrillsCollection();
    const result = await col.updateOne(
      { drillId },
      {
        $set: {
          completed: true,
          completedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }
}

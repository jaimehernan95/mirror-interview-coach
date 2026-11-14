import { getUsersCollection } from "@/lib/db/mongodb";
import { User, CreateUserInput } from "@/types/user";

export class UsersRepository {
  static async findByUserId(userId: string): Promise<User | null> {
    const col = await getUsersCollection();
    return col.findOne({ userId });
  }

  static async upsertUser(input: CreateUserInput): Promise<User> {
    const col = await getUsersCollection();
    const now = new Date();
    const result = await col.findOneAndUpdate(
      { userId: input.userId },
      {
        $set: {
          email: input.email,
          name: input.name,
          targetRole: input.targetRole,
          orgId: input.orgId || "default_org",
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return result as unknown as User;
  }
}

import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId;
  userId: string;
  email: string;
  name: string;
  targetRole: string;
  orgId?: string; // Tenant isolation support
  createdAt: Date;
  updatedAt?: Date;
}

export type CreateUserInput = Omit<User, "_id" | "createdAt" | "updatedAt">;

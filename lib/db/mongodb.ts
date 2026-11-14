import { MongoClient, Db, Collection } from "mongodb";
import { User } from "@/types/user";
import { Session } from "@/types/session";
import { Memory } from "@/types/memory";
import { Feedback } from "@/types/feedback";
import { Drill } from "@/types/drill";
import { Telemetry } from "@/types/telemetry";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB_NAME || "interview_coach";

if (!uri && process.env.NODE_ENV === "production") {
  console.warn("⚠️ Warning: MONGODB_URI environment variable is not defined.");
}

interface MongoCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

// Preserve MongoClient across Next.js HMR in development
declare global {
  // eslint-disable-next-line no-var
  var _mongoCache: MongoCache | undefined;
}

let cached: MongoCache = global._mongoCache || { client: null, promise: null };

if (!global._mongoCache) {
  global._mongoCache = cached;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Configure it in your .env.local file to connect to MongoDB Atlas."
    );
  }

  if (cached.client) {
    return cached.client;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    };
    cached.promise = MongoClient.connect(uri, opts).then((client) => {
      cached.client = client;
      return client;
    });
  }

  try {
    return await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

export async function getDatabase(targetDbName?: string): Promise<Db> {
  const client = await getMongoClient();
  return client.db(targetDbName || dbName);
}

// Strictly typed collection getters for the 6 exact hackathon collections
export async function getUsersCollection(): Promise<Collection<User>> {
  const db = await getDatabase();
  return db.collection<User>("users");
}

export async function getSessionsCollection(): Promise<Collection<Session>> {
  const db = await getDatabase();
  return db.collection<Session>("sessions");
}

export async function getMemoriesCollection(): Promise<Collection<Memory>> {
  const db = await getDatabase();
  return db.collection<Memory>("memories");
}

export async function getFeedbackCollection(): Promise<Collection<Feedback>> {
  const db = await getDatabase();
  return db.collection<Feedback>("feedback");
}

export async function getDrillsCollection(): Promise<Collection<Drill>> {
  const db = await getDatabase();
  return db.collection<Drill>("drills");
}

export async function getTelemetryCollection(): Promise<Collection<Telemetry>> {
  const db = await getDatabase();
  return db.collection<Telemetry>("telemetry");
}

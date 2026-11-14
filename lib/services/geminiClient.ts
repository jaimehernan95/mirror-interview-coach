import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

/**
 * Shared GoogleGenAI client configured with apiVersion: "v1beta".
 */
export function createGeminiClient(): GoogleGenAI | null {
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  try {
    return new GoogleGenAI({
      apiKey: apiKey.trim(),
      apiVersion: "v1beta",
    });
  } catch (err) {
    console.error("Failed to instantiate GoogleGenAI client:", err);
    return null;
  }
}

export const geminiClient = createGeminiClient();

// Supported Generation Models (active in AI Studio v1beta)
export const SUPPORTED_GENERATION_MODELS = [
  "gemini-3.8-flash",
];

// Supported Embedding Models (active in AI Studio v1beta)
export const SUPPORTED_EMBEDDING_MODELS = [
  "gemini-embedding-001",
  "gemini-embedding-2",
];

/**
 * Query available models directly from Google Generative Language API
 */
export async function listGeminiModels(): Promise<string[]> {
  const client = createGeminiClient();
  if (!client) {
    throw new Error("GEMINI_API_KEY is not configured in .env.local");
  }

  try {
    const response = await (client.models as any).list();
    const modelsList: string[] = [];
    if (response) {
      for await (const m of response) {
        if (m && m.name) {
          modelsList.push(m.name);
        }
      }
    }
    return modelsList;
  } catch (err) {
    console.error("Failed to list Gemini models:", err);
    throw err;
  }
}

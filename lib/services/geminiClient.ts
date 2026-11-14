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

// Updated Generation Models (Gemini 3.8 Flash is Google's active model for agent workflows)
export const SUPPORTED_GENERATION_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.8-flash-latest",
  "gemini-2.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];

// Updated Embedding Models (Google's native Gemini embedding lineup)
export const SUPPORTED_EMBEDDING_MODELS = [
  "gemini-embedding-001",
  "gemini-embedding-2",
  "gemini-embedding-exp",
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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google API returned status ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return (data.models || []).map((m: any) => m.name.replace(/^models\//, ""));
  } catch (err: any) {
    try {
      const response = await client.models.list();
      const modelNames: string[] = [];
      for await (const m of response as any) {
        if (m && m.name) {
          modelNames.push(m.name.replace(/^models\//, ""));
        }
      }
      return modelNames;
    } catch (sdkErr: any) {
      throw new Error(`Failed to list models from Gemini API: ${err.message || err}`);
    }
  }
}

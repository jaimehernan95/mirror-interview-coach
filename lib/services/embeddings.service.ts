import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

/**
 * Generates a unit-normalized deterministic pseudo-embedding as an offline fallback
 * if Gemini API key is missing or network is unavailable during demos.
 */
function generateFallbackEmbedding(text: string, dimension: number = 768): number[] {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  const vector: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < dimension; i++) {
    const val = Math.sin((hash + i * 31) * 0.01);
    vector.push(val);
    sumSq += val * val;
  }

  const norm = Math.sqrt(sumSq) || 1;
  return vector.map((v) => Math.round((v / norm) * 1000000) / 1000000);
}

/**
 * Generates 768-dimensional vector embedding for text using Google's text-embedding-004.
 * Formatted for MongoDB Atlas Vector Search.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim();
  if (!cleanText) {
    return new Array(768).fill(0);
  }

  if (aiClient && apiKey) {
    try {
      const response = await aiClient.models.embedContent({
        model: "text-embedding-004",
        contents: cleanText,
      });

      if (response && response.embedding && response.embedding.values) {
        return response.embedding.values;
      }
    } catch (err) {
      console.warn(
        "Gemini text-embedding-004 call failed. Utilizing deterministic Atlas-compatible fallback:",
        err
      );
    }
  }

  return generateFallbackEmbedding(cleanText, 768);
}

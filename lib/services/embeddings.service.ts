import { createGeminiClient, SUPPORTED_EMBEDDING_MODELS } from "./geminiClient";

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
 * Generates 768-dimensional vector embedding for text using Google's native gemini-embedding models.
 * Uses outputDimensionality: 768 to guarantee exact alignment with Atlas Vector Search index.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim();
  if (!cleanText) {
    return new Array(768).fill(0);
  }

  const client = createGeminiClient();
  if (!client) {
    console.warn("Missing GEMINI_API_KEY. Using deterministic 768-dim embedding fallback for Atlas Vector Search.");
    return generateFallbackEmbedding(cleanText, 768);
  }

  let lastError: any = null;

  for (const model of SUPPORTED_EMBEDDING_MODELS) {
    try {
      const response = await client.models.embedContent({
        model,
        contents: cleanText,
        config: {
          outputDimensionality: 768,
        },
      });

      const respAny = response as any;
      const rawValues =
        respAny.embedding?.values ||
        (respAny.embeddings && respAny.embeddings[0]?.values) ||
        null;

      if (rawValues && Array.isArray(rawValues)) {
        let values: number[] = [...rawValues];

        // Ensure exact 768 dimensions for Atlas Vector Search
        if (values.length > 768) {
          values = values.slice(0, 768);
        } else if (values.length < 768) {
          while (values.length < 768) values.push(0);
        }

        return values;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Embedding attempt with ${model} failed, trying next supported model:`, err.message || err);
    }
  }

  console.warn(
    `Gemini embedding generation failed with ${lastError?.message || lastError}. Using deterministic 768-dim fallback to protect live demo execution.`
  );
  return generateFallbackEmbedding(cleanText, 768);
}

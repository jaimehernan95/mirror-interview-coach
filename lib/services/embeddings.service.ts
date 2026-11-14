import { createGeminiClient, SUPPORTED_EMBEDDING_MODELS } from "./geminiClient";

/**
 * Generates a unit-normalized deterministic pseudo-embedding as an offline fallback
 * if Gemini API key is missing or network/Wi-Fi times out.
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
 * Protected by a strict 2.0-second timeout to prevent Wi-Fi latency or SDK hangs from delaying evaluation.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim();
  if (!cleanText) {
    return new Array(768).fill(0);
  }

  const client = createGeminiClient();
  if (!client) {
    return generateFallbackEmbedding(cleanText, 768);
  }

  const model = SUPPORTED_EMBEDDING_MODELS[0] || "gemini-embedding-001";

  try {
    const embedPromise = client.models.embedContent({
      model,
      contents: cleanText,
      config: {
        outputDimensionality: 768,
      },
    });

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 2000)
    );

    const response = await Promise.race([embedPromise, timeoutPromise]);

    if (response) {
      const respAny = response as any;
      const rawValues =
        respAny.embedding?.values ||
        (respAny.embeddings && respAny.embeddings[0]?.values) ||
        null;

      if (rawValues && Array.isArray(rawValues)) {
        let values: number[] = [...rawValues];
        if (values.length > 768) {
          values = values.slice(0, 768);
        } else if (values.length < 768) {
          while (values.length < 768) values.push(0);
        }
        return values;
      }
    }
  } catch (err: any) {
    console.warn(`Embedding call to ${model} failed or timed out (${err?.message || err}). Using fallback vector.`);
  }

  // Instant deterministic 768-dim fallback
  return generateFallbackEmbedding(cleanText, 768);
}

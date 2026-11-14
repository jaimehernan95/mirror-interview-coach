import { NextResponse } from "next/server";
import {
  listGeminiModels,
  createGeminiClient,
  SUPPORTED_GENERATION_MODELS,
  SUPPORTED_EMBEDDING_MODELS,
} from "@/lib/services/geminiClient";
import { generateEmbedding } from "@/lib/services/embeddings.service";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const keyPrefix = apiKey ? apiKey.substring(0, 6) + "..." : "none";
  const keyType = apiKey.startsWith("AQ.")
    ? "Google AI Studio Auth Key (AQ format)"
    : apiKey.startsWith("AIzaSy")
    ? "Google AI Studio Standard Key (AIzaSy format)"
    : "Custom / Unknown key format";

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    sdk: "@google/genai ^3.3.0",
    configuredEndpoint: "generativelanguage.googleapis.com (v1beta)",
    primaryGenerationModel: "gemini-3.8-flash",
    primaryEmbeddingModel: "gemini-embedding-001",
    apiKeyStatus: {
      configured: Boolean(apiKey),
      keyPrefix,
      keyType,
      validPrefix: apiKey.startsWith("AQ.") || apiKey.startsWith("AIzaSy"),
    },
    availableModels: [],
    tests: {
      listModels: { success: false },
      contentGeneration: { success: false },
      embeddings: { success: false },
    },
  };

  if (!apiKey) {
    return NextResponse.json(
      {
        status: "error",
        message: "GEMINI_API_KEY is not defined in .env.local",
        diagnostics,
      },
      { status: 500 }
    );
  }

  // 1. List Available Models
  try {
    const models = await listGeminiModels();
    diagnostics.availableModels = models;
    diagnostics.tests.listModels = {
      success: true,
      count: models.length,
      hasGemini38Flash: models.some((m) => m.includes("gemini-3.8-flash")),
      hasGeminiEmbedding: models.some((m) => m.includes("gemini-embedding")),
    };
  } catch (err: any) {
    diagnostics.tests.listModels = {
      success: false,
      error: err.message || String(err),
    };
  }

  // 2. Test Content Generation with gemini-3.8-flash
  try {
    const client = createGeminiClient();
    if (!client) throw new Error("Client initialization failed");

    let responseText = "";
    let activeModel = "";

    for (const model of SUPPORTED_GENERATION_MODELS) {
      try {
        const resp = await client.models.generateContent({
          model,
          contents: "Reply with the exact word: PONG",
        });
        if (resp && resp.text) {
          responseText = resp.text.trim();
          activeModel = model;
          break;
        }
      } catch (mErr: any) {
        // try next supported model
      }
    }

    if (responseText) {
      diagnostics.tests.contentGeneration = {
        success: true,
        modelUsed: activeModel,
        sampleOutput: responseText,
      };
    } else {
      throw new Error("No response generated from supported generation models.");
    }
  } catch (err: any) {
    diagnostics.tests.contentGeneration = {
      success: false,
      error: err.message || String(err),
    };
  }

  // 3. Test Embeddings with gemini-embedding-001 (768 dimensions)
  try {
    const vector = await generateEmbedding("MongoDB Atlas Vector Search with Mirror AI Coach");
    diagnostics.tests.embeddings = {
      success: true,
      dimensions: vector.length,
      validDimensions: vector.length === 768,
      sampleMagnitude: Math.sqrt(vector.slice(0, 10).reduce((a, b) => a + b * b, 0)),
    };
  } catch (err: any) {
    diagnostics.tests.embeddings = {
      success: false,
      error: err.message || String(err),
    };
  }

  const allPassed =
    diagnostics.tests.contentGeneration.success &&
    diagnostics.tests.embeddings.success;

  return NextResponse.json(
    {
      status: allPassed ? "healthy" : "degraded",
      message: allPassed
        ? "Gemini SDK (gemini-3.8-flash and gemini-embedding) verified operational."
        : "Some Gemini tests failed. Review diagnostics below.",
      diagnostics,
    },
    { status: allPassed ? 200 : 502 }
  );
}

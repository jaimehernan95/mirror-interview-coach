import { Client } from "langsmith";

const rawKey = process.env.LANGCHAIN_API_KEY || "";
const isPlaceholderKey =
  !rawKey ||
  rawKey.includes("YOUR_LANGSMITH_KEY") ||
  rawKey.includes("your_langsmith_api_key") ||
  rawKey.trim().length < 10;

const isEnabled =
  process.env.LANGCHAIN_TRACING_V2 === "true" && !isPlaceholderKey;

const projectName = process.env.LANGCHAIN_PROJECT || "mirror-interview-coach";

let client: Client | null = null;

// Only instantiate LangSmith Client when explicitly enabled with a real key
if (isEnabled) {
  try {
    client = new Client({
      apiKey: rawKey,
      apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
    });
  } catch (err) {
    console.warn("⚠️ LangSmith initialization failed. Disabling tracing to avoid TLS/SSL errors:", err);
    client = null;
  }
}

export interface TraceSpan {
  name: string;
  runType: "chain" | "llm" | "retriever" | "tool";
  inputs: Record<string, unknown>;
  startTime: number;
}

export class LangSmithService {
  /**
   * Safe execution wrapper:
   * When LangSmith is disabled or key is placeholder, runs fn() directly with zero network overhead.
   * Runs createRun asynchronously without blocking user response.
   */
  static async traceExecution<T>(
    spanName: string,
    runType: "chain" | "llm" | "retriever" | "tool",
    inputs: Record<string, unknown>,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!isEnabled || !client) {
      return await fn();
    }

    const startTime = Date.now();
    let result: T;
    let errorToThrow: unknown = null;

    try {
      result = await fn();
      return result;
    } catch (err) {
      errorToThrow = err;
      throw err;
    } finally {
      const endTime = Date.now();

      // Fire-and-forget: do NOT await client.createRun so network/Wi-Fi latency never blocks the HTTP response!
      try {
        client.createRun({
          name: spanName,
          run_type: runType,
          project_name: projectName,
          inputs,
          outputs: errorToThrow
            ? { error: String(errorToThrow) }
            : { resultSummary: "success" },
          start_time: startTime,
          end_time: endTime,
          error: errorToThrow ? String(errorToThrow) : undefined,
        }).catch(() => {});
      } catch {
        // ignore background trace errors
      }
    }
  }
}

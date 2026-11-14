import { Client } from "langsmith";

const langsmithApiKey = process.env.LANGCHAIN_API_KEY || "";
const projectName = process.env.LANGCHAIN_PROJECT || "mirror-interview-coach";
const isEnabled = Boolean(langsmithApiKey && process.env.LANGCHAIN_TRACING_V2 === "true");

let client: Client | null = null;
if (isEnabled) {
  try {
    client = new Client({
      apiKey: langsmithApiKey,
      apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
    });
  } catch (err) {
    console.warn("Failed to initialize LangSmith client:", err);
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
   * Log an agent step or memory retrieval span to LangSmith.
   */
  static async traceExecution<T>(
    spanName: string,
    runType: "chain" | "llm" | "retriever" | "tool",
    inputs: Record<string, unknown>,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let result: T;
    let errorToThrow: unknown = null;

    try {
      result = await fn();
    } catch (err) {
      errorToThrow = err;
      throw err;
    } finally {
      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      if (client && isEnabled) {
        try {
          await client.createRun({
            name: spanName,
            run_type: runType,
            project_name: projectName,
            inputs,
            outputs: errorToThrow ? { error: String(errorToThrow) } : { resultSummary: "success" },
            start_time: startTime,
            end_time: endTime,
            error: errorToThrow ? String(errorToThrow) : undefined,
          });
        } catch (traceErr) {
          console.warn("LangSmith trace dispatch warning:", traceErr);
        }
      } else {
        // Local debug trace
        // console.log(`[Trace: ${runType}] ${spanName} (${latencyMs}ms)`);
      }
    }

    return result!;
  }
}

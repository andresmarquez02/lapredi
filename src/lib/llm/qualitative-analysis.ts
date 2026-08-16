import { GoogleGenAI } from "@google/genai";
import type { QualitativeMatchContext } from "./context";
import { buildQualitativeAnalysisPrompt } from "./prompt";
import { QualitativeAnalysisResultSchema, qualitativeAnalysisJsonSchema, type QualitativeAnalysisResult } from "./schema";

// gemini-2.5-* models were retired for new API keys in favor of the
// Interactions API; gemini-3.6-flash is the current fast/cheap text model
// confirmed working against this project's API key.
const GEMINI_MODEL = "gemini-3.6-flash";

// Free tier: 20 requests/minute for gemini-3.6-flash (confirmed live
// 2026-08-16 via a 429 mid-batch-run: "limit: 20 ... free_tier_requests").
// Serialize every call through this queue, spaced out, so a batch run of
// many fixtures doesn't blow through the limit the way the API-Football
// integration originally did (see api-football-client.ts's own throttle).
const MIN_INTERVAL_MS = 3500; // 60_000 / 20 + margin
let queue: Promise<void> = Promise.resolve();
let lastCallAt = 0;

function throttle(): Promise<void> {
  const next = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
  });
  queue = next;
  return next;
}

const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 15000;

function parseRetryDelayMs(message: string): number {
  const match = message.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(Number(match[1]) * 1000) + 500 : DEFAULT_RETRY_DELAY_MS;
}

export type QualitativeAnalysisOutcome =
  | { ok: true; result: QualitativeAnalysisResult }
  | { ok: false; reason: string };

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Requests the LLM's qualitative probability distribution for a fixture.
 * Never throws for a bad/invalid model response - returns `{ ok: false }` so
 * callers (the ensemble step) can fall back to the statistical model alone,
 * per the llm-qualitative-analysis spec's fallback requirement. Rate-limit
 * errors (429) are retried with backoff (using the API's own suggested delay
 * when it provides one) before falling back, since the free tier's 20/min
 * cap is easy to hit mid-batch and usually clears within seconds.
 */
export async function analyzeQualitativeFactors(
  context: QualitativeMatchContext
): Promise<QualitativeAnalysisOutcome> {
  const prompt = buildQualitativeAnalysisPrompt(context);

  let rawText: string | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await throttle();
    try {
      const interaction = await getClient().interactions.create({
        model: GEMINI_MODEL,
        input: prompt,
        response_format: [{ type: "text", mime_type: "application/json", schema: qualitativeAnalysisJsonSchema }],
      });
      rawText = interaction.output_text;
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      // The Interactions API throws an internal RateLimitError/APIError class
      // that @google/genai does not export publicly (confirmed by inspecting
      // the SDK bundle - only the older `ApiError` from the legacy
      // generateContent path is exported), so duck-type on `status` plus the
      // message text rather than an unreliable `instanceof` check.
      const status = (error as { status?: number }).status;
      const isRateLimited = status === 429 || /\b429\b/.test((error as Error).message ?? "");
      if (!isRateLimited || attempt === MAX_RETRIES) break;

      const delay = parseRetryDelayMs((error as Error).message);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (lastError) {
    return { ok: false, reason: `Gemini call failed: ${(lastError as Error).message}` };
  }

  if (!rawText) {
    return { ok: false, reason: "Gemini returned an empty response" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, reason: "Gemini response was not valid JSON" };
  }

  const validated = QualitativeAnalysisResultSchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, reason: `Gemini response failed validation: ${validated.error.message}` };
  }

  return { ok: true, result: validated.data };
}

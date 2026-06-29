/**
 * VAULTX Multi-Provider AI Client
 *
 * UPDATED Week 11: this is now a multi-provider client, not a
 * Claude-only one — full drop-in replacement for the Week 4 version.
 * Every AI-powered module in the platform (Week 4 submission validation,
 * Week 6 code quality, Week 10 PTaaS test plans/reports, Week 11 AI Red
 * Team) imports `callClaude`, `parseJsonResponse`, `getTotalTokens` from
 * this file and needs ZERO changes — the fallback logic lives entirely
 * here, at the one chokepoint every AI call already passes through.
 *
 * PROVIDER STRATEGY:
 *   1. Try Claude (Anthropic) first — primary, best quality for this
 *      platform's structured-JSON-output use cases.
 *   2. On failure (rate limit, outage, missing/invalid key, or retries
 *      exhausted), fall back to Gemini (Google) automatically.
 *   3. Both responses are normalized into the same shape, so every
 *      downstream consumer (parseJsonResponse, getTotalTokens) works
 *      identically regardless of which provider actually served the
 *      request.
 *
 * WHY GEMINI AS THE FALLBACK (not GPT, not a local model):
 *   - Google AI Studio's free tier is genuinely free at this project's
 *     scale (no credit card required to start), which is the only
 *     option that doesn't break the zero-budget constraint that has
 *     governed every architectural decision on this platform so far.
 *   - OpenAI's API has no meaningful free tier — using it as a
 *     "free fallback" would be dishonest about cost.
 *   - A local/self-hosted model (Ollama, HuggingFace inference) would
 *     need either a GPU-backed server (not free) or be too slow/low
 *     quality for synchronous request-response flows like submission
 *     triage, which needs to feel near-instant in the demo.
 *
 * WHY FALLBACK, NOT DUAL-CALL CROSS-VALIDATION:
 *   Calling both providers on every request and comparing outputs would
 *   double API usage and latency for every single AI call platform-wide,
 *   for marginal accuracy benefit on what are already JSON-schema-
 *   constrained, low-ambiguity tasks (severity classification, dedup
 *   comparison, code review). That tradeoff fails this platform's own
 *   stated priorities (zero-cost, simplicity, speed). Fallback-on-
 *   failure gets the resilience benefit (no single point of failure)
 *   without paying the 2x-cost tax on every successful request.
 *
 *   If a specific future flow is genuinely high-stakes enough to
 *   justify dual-call cross-checking (e.g., final reward amount
 *   suggestions, if that's ever AI-assisted), build it as an opt-in
 *   wrapper around callClaude() for that one flow specifically — don't
 *   make every call site pay for it by default.
 */

import type { ClaudeMessage } from "./types";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_TOKENS  = 1024;
const MAX_RETRIES = 1; // Reduced to 1 to bound latency
const CALL_TIMEOUT_MS = 10000; // 10s hard timeout

interface CallOptions {
  system:       string;
  user:         string;
  maxTokens?:   number;
  temperature?: number;
}

/** Helper to fetch with an absolute timeout */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/** Which provider actually served a given response — useful for logging/audit, optional for callers to read */
export type AIProvider = "claude" | "gemini";

export interface AIMessage extends ClaudeMessage {
  provider: AIProvider;
}

/* ─── Public entry point — unchanged signature from Week 4 ───────────────── */
export async function callClaude(opts: CallOptions): Promise<AIMessage> {
  try {
    return await callAnthropic(opts);
  } catch (claudeErr) {
    const claudeMsg = claudeErr instanceof Error ? claudeErr.message : String(claudeErr);
    console.warn(`[AI] Claude failed, falling back to Gemini. Reason: ${claudeMsg}`);

    try {
      return await callGemini(opts);
    } catch (geminiErr) {
      const geminiMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
      throw new Error(
        `Both AI providers failed. Claude: ${claudeMsg} | Gemini: ${geminiMsg}`
      );
    }
  }
}

/* ─── Anthropic Claude (primary) ──────────────────────────────────────────── */
async function callAnthropic(opts: CallOptions): Promise<AIMessage> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const body = {
    model:      ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
    system:     opts.system,
    messages:   [{ role: "user", content: opts.user }],
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
  };

  let lastErr: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt)); // Reduced backoff

    try {
      const res = await fetchWithTimeout(ANTHROPIC_API, {
        method:  "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      }, CALL_TIMEOUT_MS);

      if (res.status === 429) { lastErr = new Error("Claude API rate limited"); continue; }

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`Claude API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return { ...data, provider: "claude" } as AIMessage;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt === MAX_RETRIES) break;
    }
  }

  throw lastErr ?? new Error("Claude API call failed after retries");
}

/* ─── Google Gemini (fallback) ────────────────────────────────────────────── */
async function callGemini(opts: CallOptions): Promise<AIMessage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured — no fallback available");

  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? MAX_TOKENS,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    },
  };

  const res = await fetchWithTimeout(`${GEMINI_API}?key=${apiKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  }, CALL_TIMEOUT_MS);

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";

  if (!text) throw new Error("Gemini returned an empty response");

  // Normalize into the same shape callAnthropic() returns, so
  // parseJsonResponse() and getTotalTokens() work unchanged for either provider.
  return {
    id: data.candidates?.[0]?.index?.toString() ?? "gemini-response",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    usage: {
      input_tokens:  data?.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
    },
    provider: "gemini",
  };
}

/* ─── Parse JSON from a response (provider-agnostic — works for both) ────── */
export function parseJsonResponse<T>(message: AIMessage): T {
  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `Failed to parse ${message.provider} JSON response: ${cleaned.slice(0, 200)}`
    );
  }
}

/* ─── Token usage helper (provider-agnostic) ──────────────────────────────── */
export function getTotalTokens(message: AIMessage): number {
  return (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
}

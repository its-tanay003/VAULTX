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
  taskType?:    string;
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
  const startTime = Date.now();
  const taskType = opts.taskType || "unspecified";

  try {
    const res = await callAnthropic(opts);
    const latency = Date.now() - startTime;
    // Log success for Claude
    logTelemetry("claude", ANTHROPIC_MODEL, taskType, res.usage.input_tokens, res.usage.output_tokens, latency, true);
    return res;
  } catch (claudeErr) {
    const claudeMsg = claudeErr instanceof Error ? claudeErr.message : String(claudeErr);
    console.warn(`[AI] Claude failed, falling back to Gemini. Reason: ${claudeMsg}`);

    // Log failure for Claude
    const claudeLatency = Date.now() - startTime;
    logTelemetry("claude", ANTHROPIC_MODEL, taskType, 0, 0, claudeLatency, false, claudeMsg);

    const geminiStartTime = Date.now();
    try {
      const res = await callGemini(opts);
      const latency = Date.now() - geminiStartTime;
      // Log success for Gemini
      logTelemetry("gemini", GEMINI_MODEL, taskType, res.usage.input_tokens, res.usage.output_tokens, latency, true);
      return res;
    } catch (geminiErr) {
      const geminiMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
      const geminiLatency = Date.now() - geminiStartTime;
      // Log failure for Gemini
      logTelemetry("gemini", GEMINI_MODEL, taskType, 0, 0, geminiLatency, false, geminiMsg);

      throw new Error(
        `Both AI providers failed. Claude: ${claudeMsg} | Gemini: ${geminiMsg}`
      );
    }
  }
}

async function logTelemetry(
  provider: string,
  model: string,
  taskType: string,
  promptTokens: number,
  completionTokens: number,
  latencyMs: number,
  success: boolean,
  errorMessage?: string
) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ai_call_logs").insert({
      user_id: user?.id || null,
      provider,
      model,
      task_type: taskType,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      latency_ms: latencyMs,
      success,
      error_message: errorMessage || null,
    });
  } catch (err) {
    console.error("[AI Telemetry] Failed to write log:", err);
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

/* ─────────────────────────────────────────────────────────────────────────────
 * Streaming entry point (added for the VAULT agent's chat UI)
 *
 * Kept in this same file rather than a separate implementation, per the
 * platform's standing AI-integration rule: every call site should be
 * multi-provider without duplicating fallback logic. streamClaude()
 * mirrors callClaude()'s Claude-primary/Gemini-fallback strategy, with
 * one necessary difference: the fallback can only happen if the
 * Claude request fails before any chunk has been yielded. Once
 * streaming has started and reached the client, silently switching
 * providers mid-response isn't possible without confusing whatever's
 * consuming the stream — a genuine failure after that point surfaces
 * as an error chunk instead.
 * ────────────────────────────────────────────────────────────────────────── */

export interface StreamCallOptions extends CallOptions {
  history?: { role: "user" | "assistant"; content: string }[];
}

/** Async generator yielding text chunks as they arrive. Consumers `for await` this directly. */
export async function* streamClaude(opts: StreamCallOptions): AsyncGenerator<string> {
  let yieldedAny = false;
  try {
    for await (const chunk of streamAnthropic(opts)) {
      yieldedAny = true;
      yield chunk;
    }
  } catch (claudeErr) {
    if (yieldedAny) {
      const msg = claudeErr instanceof Error ? claudeErr.message : String(claudeErr);
      yield `\n\n[Connection interrupted: ${msg}]`;
      return;
    }
    console.warn("[AI Stream] Claude failed before first chunk, falling back to Gemini:", claudeErr);
    yield* streamGemini(opts);
  }
}

async function* streamAnthropic(opts: StreamCallOptions): AsyncGenerator<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const messages = [...(opts.history ?? []), { role: "user" as const, content: opts.user }];

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? MAX_TOKENS,
      system: opts.system,
      messages,
      stream: true,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Claude streaming API error ${res.status}: ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") return;

      try {
        const event = JSON.parse(payload);
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          yield event.delta.text as string;
        }
      } catch {
        // Malformed SSE chunk — skip it rather than aborting the whole stream.
      }
    }
  }
}

async function* streamGemini(opts: StreamCallOptions): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured — no streaming fallback available");

  const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = [
    ...(opts.history ?? []).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    { role: "user", parts: [{ text: opts.user }] },
  ];

  const res = await fetch(streamUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents,
      generationConfig: { maxOutputTokens: opts.maxTokens ?? MAX_TOKENS, ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}) },
    }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini streaming API error ${res.status}: ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        const text = event?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
        if (text) yield text;
      } catch {
        // Skip malformed chunk
      }
    }
  }
}

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

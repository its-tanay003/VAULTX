import type { ClaudeMessage } from "./types";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL         = "claude-sonnet-4-6";
const MAX_TOKENS    = 1024;
const MAX_RETRIES   = 2;

interface CallOptions {
  system:      string;
  user:        string;
  maxTokens?:  number;
  temperature?:number;
}

/* ─── Core Claude call with retry ────────────────────────────────────────── */
export async function callClaude(opts: CallOptions): Promise<ClaudeMessage> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const body = {
    model:      MODEL,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
    system:     opts.system,
    messages:   [{ role: "user", content: opts.user }],
  };

  let lastErr: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }

    try {
      const res = await fetch(ANTHROPIC_API, {
        method:  "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        // Rate limited — always retry
        lastErr = new Error("Claude API rate limited");
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`Claude API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return data as ClaudeMessage;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt === MAX_RETRIES) break;
    }
  }

  throw lastErr ?? new Error("Claude API call failed after retries");
}

/* ─── Parse JSON from Claude response (strips accidental markdown) ────────── */
export function parseJsonResponse<T>(message: ClaudeMessage): T {
  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/,           "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Failed to parse Claude JSON response: ${cleaned.slice(0, 200)}`);
  }
}

/* ─── Token usage helper ──────────────────────────────────────────────────── */
export function getTotalTokens(message: ClaudeMessage): number {
  return (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
}

/**
 * VAULTX Public API — Rate Limiting
 *
 * Same Upstash REST pattern already used inline in
 * app/actions/submissions.ts, extracted here so every public API route
 * shares one implementation. Keyed by API key id (not user id) since a
 * single user can hold multiple keys, each of which should get its own
 * budget — a script using one key shouldn't burn through the same
 * quota as a human using the dashboard under the same account.
 *
 * Gracefully no-ops if Upstash isn't configured, same fallback
 * behavior as the existing submission flow, so this never becomes a
 * hard dependency for local dev or a fresh deploy.
 */

const WINDOW_SECONDS = 3600; // 1 hour
const DEFAULT_LIMIT  = 100;  // requests per key per hour — generous for CI/scripts, still bounded

export async function checkApiRateLimit(keyId: string, limit = DEFAULT_LIMIT): Promise<{ ok: boolean; remaining: number }> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { ok: true, remaining: limit }; // not configured — skip

  const key = `rate:api:${keyId}`;

  try {
    const res = await fetch(`${url}/incr/${key}`, { headers: { Authorization: `Bearer ${token}` } });
    const { result: count } = await res.json();

    if (count === 1) {
      await fetch(`${url}/expire/${key}/${WINDOW_SECONDS}`, { headers: { Authorization: `Bearer ${token}` } });
    }

    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (err) {
    // Fail open — a Redis outage shouldn't take down the public API.
    console.error("[API Rate Limit] Check failed, allowing request:", err);
    return { ok: true, remaining: limit };
  }
}

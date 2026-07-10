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

export async function checkApiRateLimit(
  keyId: string,
  limit = DEFAULT_LIMIT,
  isHighCost = false
): Promise<{ ok: boolean; remaining: number }> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    if (isHighCost) {
      console.warn(`[API Rate Limit WARNING] Upstash Redis URL or Token is missing. Blocking high-cost action for keyId: ${keyId}`);
      return { ok: false, remaining: 0 };
    }
    return { ok: true, remaining: limit }; // cheap actions: skip
  }

  const key = `rate:api:${keyId}`;

  try {
    const res = await fetch(`${url}/incr/${key}`, { headers: { Authorization: `Bearer ${token}` } });
    const { result: count } = await res.json();

    if (count === 1) {
      await fetch(`${url}/expire/${key}/${WINDOW_SECONDS}`, { headers: { Authorization: `Bearer ${token}` } });
    }

    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (err) {
    // Alerting: Log warning when connection fails or Upstash is down
    console.error(`[API Rate Limit ERROR] Check failed for keyId: ${keyId}. Redis outage or connection issue:`, err);
    
    // Fail-closed for high-cost actions (AI / Scans) to prevent cost abuse during outages
    if (isHighCost) {
      return { ok: false, remaining: 0 };
    }
    
    // Fail-open for standard API calls
    return { ok: true, remaining: limit };
  }
}

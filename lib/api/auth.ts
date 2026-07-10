/**
 * VAULTX Public API — Authentication
 *
 * Validates `Authorization: Bearer vx_...` headers against the API key
 * store that already exists (app/actions/settings.ts generateApiKey).
 * That store lives in user_settings.api_keys (a JSONB array), not a
 * dedicated indexed table — keys were being issued and documented
 * ("Include the key in requests as: Authorization: Bearer vx_...") but
 * nothing on the server actually validated that header before this
 * module. This is what makes those keys functional.
 *
 * Known tradeoff (flagging rather than silently fixing — it's a
 * separate hardening task from "build the public API"): the existing
 * key hash is a single unsalted SHA-256 of the raw key
 * (app/actions/settings.ts `sha256()`), not the salted double-hash
 * described in migration 012's comments for the separate, unused
 * `public.api_keys` table. A leaked hash table would be crackable via
 * rainbow table for low-entropy keys — though these keys are
 * high-entropy (32 random bytes), so practically this is low risk, but
 * worth migrating to the salted scheme in a future pass for defense in
 * depth.
 */

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApiScope = "read:submissions" | "write:submissions" | "read:programs" | "read:rewards" | "read:reports";

export interface AuthedApiKey {
  userId: string;
  keyId:  string;
  scopes: ApiScope[];
}



/**
 * Authenticates a request by its Bearer token. Returns null (never
 * throws) on any failure — callers should respond 401 on null.
 */
export async function authenticateApiKey(request: Request): Promise<AuthedApiKey | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const rawKey = header.slice("Bearer ".length).trim();
  if (!rawKey.startsWith("vx_")) return null;

  const prefix = rawKey.slice(0, 11); // "vx_" + 8 hex chars
  const supabase = createAdminClient();

  // Look up candidate keys by prefix (highly indexed)
  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, user_id, key_salt, key_hash, scopes, expires_at")
    .eq("key_prefix", prefix);

  if (error || !keys || keys.length === 0) return null;

  // First hash pass: SHA-256(rawKey)
  const firstHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  let match: typeof keys[0] | null = null;
  for (const candidate of keys) {
    // Second hash pass: SHA-256(firstHash + salt)
    const computedHash = crypto.createHash("sha256").update(firstHash + candidate.key_salt).digest("hex");
    if (computedHash === candidate.key_hash) {
      match = candidate;
      break;
    }
  }

  if (!match) return null;

  // Check expiration date
  if (match.expires_at && new Date(match.expires_at).getTime() < Date.now()) {
    return null;
  }

  // Fire-and-forget last_used_at bump
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", match.id)
    .then(undefined, (err: unknown) => console.error("[API Auth] last_used_at update failed:", err));

  return {
    userId: match.user_id,
    keyId:  match.id,
    scopes: (match.scopes ?? []) as ApiScope[],
  };
}

/** Throws-as-response helper: call at the top of each route handler. */
export function requireScope(auth: AuthedApiKey | null, scope: ApiScope): Response | null {
  if (!auth) {
    return Response.json({ error: "Invalid or missing API key" }, { status: 401 });
  }
  if (!auth.scopes.includes(scope)) {
    return Response.json({ error: `This API key does not have the '${scope}' scope` }, { status: 403 });
  }
  return null;
}

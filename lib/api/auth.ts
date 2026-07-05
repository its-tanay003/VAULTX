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

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
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

  const keyHash = sha256(rawKey);
  const supabase = createAdminClient();

  // JSONB array containment match: find the user_settings row whose
  // api_keys array contains an entry with this hash. PostgREST's `cs`
  // (contains) operator on a jsonb column checks array/object
  // containment, so this finds the row without needing a dedicated
  // indexed key table.
  const { data: rows, error } = await supabase
    .from("user_settings")
    .select("id, api_keys")
    .filter("api_keys", "cs", JSON.stringify([{ hash: keyHash }]));

  if (error || !rows?.length) return null;

  const row = rows[0];
  const keys = (row.api_keys as { id: string; hash: string; scopes: string[] }[]) ?? [];
  const match = keys.find((k) => k.hash === keyHash);
  if (!match) return null;

  // Fire-and-forget last_used_at bump — never block the request on it.
  const updated = keys.map((k) => (k.id === match.id ? { ...k, last_used_at: new Date().toISOString() } : k));
  supabase.from("user_settings").update({ api_keys: updated }).eq("id", row.id)
    .then(undefined, (err: unknown) => console.error("[API Auth] last_used_at update failed:", err));

  return {
    userId: row.id,
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

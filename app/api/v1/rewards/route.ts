import { authenticateApiKey, requireScope } from "@/lib/api/auth";
import { checkApiRateLimit } from "@/lib/api/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/v1/rewards
 * Scope: read:rewards
 * Researchers see rewards they've earned; org accounts see rewards
 * owed by organizations they own. Scoped by the key owner's role, not
 * a query param, so a key can't be used to enumerate another
 * account's payout history.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  const scopeError = requireScope(auth, "read:rewards");
  if (scopeError) return scopeError;

  const rl = await checkApiRateLimit(auth!.keyId);
  if (!rl.ok) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });

  const url   = new URL(request.url);
  const limit = Math.min(100, Number(url.searchParams.get("limit")) || 20);

  const supabase = createAdminClient();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth!.userId).single();

  let query = supabase
    .from("rewards")
    .select("id, submission_id, org_id, amount, currency, status, approved_at, paid_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (profile?.role === "researcher") {
    query = query.eq("researcher_id", auth!.userId);
  } else {
    const { data: orgs } = await supabase.from("organizations").select("id").eq("owner_id", auth!.userId);
    const orgIds = (orgs ?? []).map((o) => o.id);
    if (orgIds.length === 0) return Response.json({ data: [], count: 0 });
    query = query.in("org_id", orgIds);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ data, count: data.length }, { headers: { "X-RateLimit-Remaining": String(rl.remaining) } });
}

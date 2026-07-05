import { authenticateApiKey, requireScope } from "@/lib/api/auth";
import { checkApiRateLimit } from "@/lib/api/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/v1/programs
 * Scope: read:programs
 * Lists active, publicly-scoped bounty programs — the same set a
 * researcher would see browsing the dashboard's program directory.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  const scopeError = requireScope(auth, "read:programs");
  if (scopeError) return scopeError;

  const rl = await checkApiRateLimit(auth!.keyId);
  if (!rl.ok) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });

  const url   = new URL(request.url);
  const limit = Math.min(100, Number(url.searchParams.get("limit")) || 20);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, slug, type, description, scope_in, scope_out, min_reward, max_reward, avg_response_hours, total_submissions")
    .eq("status", "active")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ data, count: data.length }, { headers: { "X-RateLimit-Remaining": String(rl.remaining) } });
}

import { authenticateApiKey, requireScope } from "@/lib/api/auth";
import { checkApiRateLimit } from "@/lib/api/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/v1/reports
 * Scope: read:reports
 * Lists PTaaS pentest reports for engagements the key owner is
 * involved in — either as the org owner who commissioned it, or the
 * pentester assigned to it. Returns metadata + executive summary, not
 * the full PDF; use the signed PDF download route
 * (/api/ptaas/[engagementId]/report-pdf) for the complete document.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  const scopeError = requireScope(auth, "read:reports");
  if (scopeError) return scopeError;

  const rl = await checkApiRateLimit(auth!.keyId);
  if (!rl.ok) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });

  const url   = new URL(request.url);
  const limit = Math.min(100, Number(url.searchParams.get("limit")) || 20);

  const supabase = createAdminClient();

  const { data: orgs } = await supabase.from("organizations").select("id").eq("owner_id", auth!.userId);
  const orgIds = (orgs ?? []).map((o) => o.id);

  const { data: engagements } = await supabase
    .from("pentest_engagements")
    .select("id")
    .or(`assigned_pentester_id.eq.${auth!.userId}${orgIds.length ? `,org_id.in.(${orgIds.join(",")})` : ""}`);

  const engagementIds = (engagements ?? []).map((e) => e.id);
  if (engagementIds.length === 0) return Response.json({ data: [], count: 0 });

  const { data, error } = await supabase
    .from("pentest_reports")
    .select("id, engagement_id, executive_summary, generated_at, pdf_sha256, pdf_generated_at")
    .in("engagement_id", engagementIds)
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ data, count: data.length }, { headers: { "X-RateLimit-Remaining": String(rl.remaining) } });
}

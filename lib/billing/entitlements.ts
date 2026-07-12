import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client with service role to bypass standard RLS filters for limits
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PlanLimits {
  seats: number;
  active_programs: number;
  red_team_runs_monthly: number;
  audit_contest_submissions: number;
  private_repos_scanned: number;
  ai_triage_requests_monthly: number;
  max_pdf_reports_monthly: number;
  ptaas_concurrent_engagements: number;
  ctf_active: number;
  contests_active: number;
  [key: string]: number;
}

/**
 * Retrieves the subscription tier and associated capability limits of an organization.
 */
export async function getOrgLimits(orgId: string): Promise<PlanLimits> {
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("subscription_tier")
    .eq("id", orgId)
    .single();

  const tier = org?.subscription_tier || "free";

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("limits")
    .ilike("name", tier)
    .maybeSingle();

  if (plan?.limits) {
    return plan.limits as unknown as PlanLimits;
  }

  // Fallback to absolute baseline Free tier if plans table seed is not loaded
  return {
    seats: 1,
    active_programs: 1,
    red_team_runs_monthly: 1,
    audit_contest_submissions: 0,
    private_repos_scanned: 0,
    ai_triage_requests_monthly: 5,
    max_pdf_reports_monthly: 1,
    ptaas_concurrent_engagements: 0,
    ctf_active: 0,
    contests_active: 0,
  };
}

/**
 * Checks if a specific feature entitlement quota has been exceeded for an organization.
 */
export async function checkEntitlement(
  orgId: string,
  feature: keyof PlanLimits,
  currentUsage: number
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limits = await getOrgLimits(orgId);
  const limit = limits[feature] ?? 0;
  const remaining = Math.max(0, limit - currentUsage);

  return {
    allowed: currentUsage < limit,
    remaining,
    limit,
  };
}

/**
 * Logs a quota-consuming event for usage auditing.
 */
export async function logUsage(
  orgId: string,
  metric: string,
  amount: number
): Promise<void> {
  // Determine current billing cycle start/end dates
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  await supabaseAdmin.from("usage_logs").insert({
    org_id: orgId,
    metric,
    amount,
    period_start: periodStart,
    period_end: periodEnd,
  });
}

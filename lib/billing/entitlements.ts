import { createClient } from "@supabase/supabase-js";
import { getOrgAddons, addonBonusForLimit } from "./addons";

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

/** Hard-coded Free tier floor — used if the plans table seed hasn't run yet. */
const FREE_TIER_DEFAULTS: PlanLimits = {
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

/**
 * Resolves the effective limits for an org using a three-layer cascade:
 *
 *  1. Plan defaults  — from the plans table row matching the org's tier.
 *  2. Limit overrides — organizations.limit_overrides (enterprise custom terms).
 *                        Any key present here beats the plan default for that key.
 *  3. Add-on bonuses — subscription_addons rows purchased on top of the base plan.
 *                        Added *after* overrides so enterprise limits + add-ons
 *                        both contribute.
 *
 * This function is the single source of truth called by checkEntitlement()
 * and by the billing dashboard's usage bars — they can never disagree.
 */
export async function getOrgLimits(orgId: string): Promise<PlanLimits> {
  // ── 1. Fetch org row (tier + overrides) ─────────────────────────────────────
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("subscription_tier, limit_overrides")
    .eq("id", orgId)
    .single();

  const tier = org?.subscription_tier ?? "free";
  const overrides: Record<string, number> = (org?.limit_overrides as Record<string, number>) ?? {};

  // ── 2. Plan defaults ─────────────────────────────────────────────────────────
  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("limits")
    .ilike("name", tier)
    .maybeSingle();

  const planLimits: PlanLimits = (plan?.limits as PlanLimits) ?? FREE_TIER_DEFAULTS;

  // ── 3. Add-on bonuses ────────────────────────────────────────────────────────
  const addons = await getOrgAddons(orgId);

  // Merge: override wins over plan; add-on bonus stacks on top of the winner
  const resolved: PlanLimits = { ...planLimits };
  for (const key of Object.keys(resolved)) {
    const base = key in overrides ? overrides[key] : planLimits[key] ?? 0;
    const bonus = addonBonusForLimit(addons, key);
    resolved[key] = base + bonus;
  }
  // Also apply any override keys that weren't in planLimits (unknown future fields)
  for (const [key, val] of Object.entries(overrides)) {
    if (!(key in resolved)) {
      const bonus = addonBonusForLimit(addons, key);
      resolved[key] = (val as number) + bonus;
    }
  }

  return resolved;
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

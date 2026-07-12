/**
 * VAULTX — Subscription Add-ons
 *
 * Thin helpers for reading, writing, and reconciling add-on line items.
 * All writes come from the Stripe webhook handler (service role) — no
 * authenticated user can directly mutate quantities.
 *
 * KNOWN ADDON TYPES (matches the comment in 031_subscription_addons.sql):
 *   extra_seats, extra_ai_triage, extra_red_team_runs,
 *   extra_pdf_reports, extra_private_repos, extra_ptaas_engagements
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Addon {
  id: string;
  org_id: string;
  addon_type: string;
  quantity: number;
  stripe_subscription_item_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Returns every active add-on for an org, keyed by addon_type for O(1)
 * lookup inside getOrgLimits().
 */
export async function getOrgAddons(orgId: string): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin
    .from("subscription_addons")
    .select("addon_type, quantity")
    .eq("org_id", orgId);

  if (error) return new Map();

  return new Map((data ?? []).map((r) => [r.addon_type as string, r.quantity as number]));
}

/**
 * Upserts a single add-on row.
 * Called by the Stripe webhook handler when a subscription item is
 * created, updated, or deleted (quantity=0 → delete the row).
 */
export async function upsertAddon(
  orgId: string,
  addonType: string,
  quantity: number,
  stripeSubscriptionItemId: string
): Promise<void> {
  if (quantity <= 0) {
    // Remove the row — the item was removed from the Stripe subscription
    await supabaseAdmin
      .from("subscription_addons")
      .delete()
      .eq("org_id", orgId)
      .eq("addon_type", addonType);
    return;
  }

  await supabaseAdmin.from("subscription_addons").upsert(
    {
      org_id: orgId,
      addon_type: addonType,
      quantity,
      stripe_subscription_item_id: stripeSubscriptionItemId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,addon_type" }
  );
}

/**
 * Computes the total addon bonus for a given PlanLimits key.
 *
 * Addon types map to limit keys by a simple convention:
 *   "extra_seats"              → seats
 *   "extra_ai_triage"          → ai_triage_requests_monthly  (per 100 units)
 *   "extra_red_team_runs"      → red_team_runs_monthly
 *   "extra_pdf_reports"        → max_pdf_reports_monthly
 *   "extra_private_repos"      → private_repos_scanned
 *   "extra_ptaas_engagements"  → ptaas_concurrent_engagements
 */
export function addonBonusForLimit(addons: Map<string, number>, limitKey: string): number {
  const mapping: Record<string, { addonType: string; multiplier: number }> = {
    seats:                        { addonType: "extra_seats",             multiplier: 1 },
    ai_triage_requests_monthly:   { addonType: "extra_ai_triage",         multiplier: 100 },
    red_team_runs_monthly:        { addonType: "extra_red_team_runs",      multiplier: 1 },
    max_pdf_reports_monthly:      { addonType: "extra_pdf_reports",        multiplier: 1 },
    private_repos_scanned:        { addonType: "extra_private_repos",      multiplier: 1 },
    ptaas_concurrent_engagements: { addonType: "extra_ptaas_engagements",  multiplier: 1 },
  };

  const entry = mapping[limitKey];
  if (!entry) return 0;
  const qty = addons.get(entry.addonType) ?? 0;
  return qty * entry.multiplier;
}

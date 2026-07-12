import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, ShieldAlert, CreditCard, ChevronRight, HelpCircle } from "lucide-react";
import { getOrgLimits } from "@/lib/billing/entitlements";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FeatureComparison } from "@/components/billing/feature-comparison";
import { PortalButton } from "@/components/billing/portal-button";

export const metadata = {
  title: "Billing & Plans — VAULTX",
};

interface MetricUsage {
  label: string;
  used: number;
  limit: number;
  metric: string;
}

export default async function BillingDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/dashboard");

  const orgId = profile.org_id;

  // Load org info
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  // Load active subscription details
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, plans(*)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Load historical invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5);

  const limits = await getOrgLimits(orgId);

  // Fetch current month usages
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 1. Seats
  const { count: memberCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  // 2. Active Programs
  const { count: programCount } = await supabase
    .from("programs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "active");

  // 3. AI Scan Triages
  const { data: orgRepos } = await supabase
    .from("code_repos")
    .select("id")
    .eq("org_id", orgId);
  const repoIds = orgRepos?.map(r => r.id) || [];
  let aiScansCount = 0;
  if (repoIds.length > 0) {
    const { count } = await supabase
      .from("code_scans")
      .select("id", { count: "exact", head: true })
      .in("repo_id", repoIds)
      .eq("status", "complete")
      .gte("completed_at", startOfMonth);
    aiScansCount = count || 0;
  }

  // 4. AI Red Team runs
  const { data: orgTargets } = await supabase
    .from("red_team_targets")
    .select("id")
    .eq("org_id", orgId);
  const targetIds = orgTargets?.map(t => t.id) || [];
  let redTeamRunsCount = 0;
  if (targetIds.length > 0) {
    const { count } = await supabase
      .from("red_team_scans")
      .select("id", { count: "exact", head: true })
      .in("target_id", targetIds)
      .eq("status", "complete")
      .gte("completed_at", startOfMonth);
    redTeamRunsCount = count || 0;
  }

  const USAGE_METRICS: MetricUsage[] = [
    { label: "Team Seats", used: memberCount || 0, limit: limits.seats, metric: "seats" },
    { label: "Active Programs", used: programCount || 0, limit: limits.active_programs, metric: "active_programs" },
    { label: "AI Scan triages / mo", used: aiScansCount, limit: limits.ai_triage_requests_monthly, metric: "ai_triage_requests_monthly" },
    { label: "AI Red Team runs / mo", used: redTeamRunsCount, limit: limits.red_team_runs_monthly, metric: "red_team_runs_monthly" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Billing & Plans</h1>
          <p className="text-sm text-vault-muted mt-0.5">Manage your organization subscription and usage quotas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan card */}
        <div className="md:col-span-2 vault-card p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] text-vault-muted font-bold uppercase tracking-wider">Current Plan</span>
                <h2 className="text-2xl font-bold text-vault-teal capitalize mt-0.5">
                  {org?.subscription_tier || "Free"}
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-vault-teal/20 bg-vault-teal/5 text-vault-teal">
                {sub?.status === "active" ? "Subscribed" : "Free Tier"}
              </span>
            </div>

            <div className="text-sm text-vault-subtle">
              {sub ? (
                <div className="flex items-center gap-1.5 text-xs text-vault-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Your subscription renews on {formatDate(sub.current_period_end)}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-vault-muted">
                  You are on the Free tier. Upgrade to unlock Solidity code scans, PTaaS engagements, and team seats.
                </p>
              )}
            </div>
          </div>

          <div className="pt-6 flex gap-3">
            <PortalButton />
          </div>
        </div>

        {/* Stripe Info Card */}
        <div className="vault-card p-6 bg-vault-elevated/50 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-vault-teal" /> Stripe Billing
            </h3>
            <p className="text-xs text-vault-muted leading-relaxed">
              We leverage Stripe for fully compliant billing, invoice management, and secure payouts.
            </p>
          </div>
          <div className="h-px bg-vault-border/50" />
          <Link
            href="/pricing"
            className="text-xs text-vault-teal hover:underline flex items-center gap-1 self-start"
          >
            View pricing plans <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Quota meters section */}
      <div className="vault-card p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold">Plan Quota Usage</h3>
          <p className="text-xs text-vault-muted mt-0.5">Calculated based on active entities and monthly usage cycle.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {USAGE_METRICS.map((m) => {
            const ratio = m.limit === 0 ? 0 : Math.min(100, (m.used / m.limit) * 100);
            const isLimitReached = m.used >= m.limit && m.limit !== 999999;
            return (
              <div key={m.label} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-vault-subtle">{m.label}</span>
                  <span className={isLimitReached ? "text-vault-danger font-semibold" : "text-vault-muted"}>
                    {m.used} / {m.limit >= 999999 ? "∞" : m.limit}
                  </span>
                </div>
                <div className="h-2 w-full bg-vault-elevated border border-vault-border rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isLimitReached ? "bg-vault-danger" : "bg-vault-teal"
                    }`}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices log */}
      {invoices && invoices.length > 0 && (
        <div className="vault-card overflow-hidden">
          <div className="px-6 py-4 border-b border-vault-border">
            <h3 className="text-sm font-semibold">Invoice History</h3>
          </div>
          <div className="divide-y divide-vault-border/40">
            {invoices.map((inv) => (
              <div key={inv.id} className="px-6 py-4 flex items-center justify-between hover:bg-vault-surface/20 transition-colors">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-vault-text">
                    Invoice #{inv.stripe_invoice_id.slice(-8).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-vault-muted">{formatDate(inv.created_at)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-vault-text">
                    {formatCurrency(inv.amount_cents / 100)}
                  </span>
                  {inv.pdf_url && (
                    <a
                      href={inv.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-vault-teal hover:underline"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature comparison */}
      <FeatureComparison currentTier={org?.subscription_tier || "free"} />
    </div>
  );
}

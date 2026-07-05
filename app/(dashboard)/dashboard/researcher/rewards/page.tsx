import { createClient }   from "@/lib/supabase/server";
import { redirect }        from "next/navigation";
import Link                from "next/link";
import {
  Trophy, DollarSign, Clock, CheckCircle2, ChevronRight, AlertTriangle,
} from "lucide-react";
import { StatCard }        from "@/components/ui/stat-card";
import { StripeConnectCard } from "@/components/payouts/stripe-connect-card";
import { formatCurrency, formatDate, truncate } from "@/lib/utils";
import type { Metadata }   from "next";
import type { RewardStatus } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Earnings" };

const STATUS_CFG: Record<RewardStatus, { label: string; cls: string }> = {
  pending:  { label: "Pending Approval", cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
  approved: { label: "Approved",         cls: "text-teal-400 bg-teal-950/50 border-teal-900/50" },
  paid:     { label: "Paid",             cls: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50" },
  declined: { label: "Declined",         cls: "text-red-400 bg-red-950/50 border-red-900/50" },
};

const PAYOUT_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  processing: { label: "Processing",  cls: "text-blue-400 bg-blue-950/50 border-blue-900/50" },
  failed:     { label: "Payout failed", cls: "text-red-400 bg-red-950/50 border-red-900/50" },
};

export default async function ResearcherRewardsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_onboarding_complete, stripe_payouts_enabled")
    .eq("id", user.id)
    .single();

  const { data: rewards } = await supabase
    .from("rewards")
    .select(`
      id, amount, currency, status, created_at, approved_at, paid_at, note,
      payout_status, payout_failure_reason,
      submissions(id, title, severity),
      organizations(name)
    `)
    .eq("researcher_id", user.id)
    .order("created_at", { ascending: false });

  const all = rewards ?? [];
  const totalPaid     = all.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const totalPending  = all.filter((r) => r.status === "approved").reduce((s, r) => s + r.amount, 0);
  const awaitingCount = all.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in">
      <div>
        <h1 className="text-xl font-semibold">Earnings</h1>
        <p className="text-sm text-vault-muted mt-0.5">Your reward history across all programs</p>
      </div>

      <StripeConnectCard
        onboardingComplete={profile?.stripe_onboarding_complete ?? false}
        payoutsEnabled={profile?.stripe_payouts_enabled ?? false}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Earned"
          value={formatCurrency(totalPaid)}
          icon={<Trophy className="w-4 h-4" />}
          accent="teal"
        />
        <StatCard
          label="Pending Payment"
          value={formatCurrency(totalPending)}
          icon={<Clock className="w-4 h-4" />}
          accent="amber"
        />
        <StatCard
          label="Awaiting Org Approval"
          value={awaitingCount}
          icon={<Clock className="w-4 h-4" />}
          accent="blue"
        />
        <StatCard
          label="Total Rewards"
          value={all.length}
          icon={<DollarSign className="w-4 h-4" />}
          accent="green"
        />
      </div>

      {/* List */}
      {all.length === 0 ? (
        <div className="vault-card flex flex-col items-center justify-center py-16 text-center">
          <Trophy className="w-8 h-8 text-vault-muted mb-3 opacity-50" />
          <p className="font-medium mb-1">No rewards yet</p>
          <p className="text-sm text-vault-muted mb-5">
            Submit reports and get accepted to start earning
          </p>
          <Link href="/dashboard/researcher/programs" className="btn-teal">
            Browse Programs
          </Link>
        </div>
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {all.map((r) => {
            const cfg = STATUS_CFG[r.status as RewardStatus];
            const sub = Array.isArray(r.submissions) ? r.submissions[0] : r.submissions;
            const org = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations;
            return (
              <Link
                key={r.id}
                href={`/dashboard/researcher/submissions/${sub?.id}`}
                className="flex items-center gap-4 p-4 hover:bg-vault-elevated/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-vault-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                    {truncate(sub?.title ?? "Submission", 55)}
                  </p>
                  <p className="text-xs text-vault-muted mt-0.5">
                    {org?.name} · {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-vault-teal">
                    {formatCurrency(r.amount, r.currency)}
                  </p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  {r.payout_status && PAYOUT_STATUS_CFG[r.payout_status] && (
                    <div className="mt-1">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${PAYOUT_STATUS_CFG[r.payout_status].cls}`}>
                        {PAYOUT_STATUS_CFG[r.payout_status].label}
                      </span>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-vault-muted shrink-0 group-hover:text-vault-teal transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

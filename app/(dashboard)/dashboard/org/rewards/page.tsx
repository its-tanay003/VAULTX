import { createClient }   from "@/lib/supabase/server";
import { redirect }        from "next/navigation";
import Link                from "next/link";
import {
  Trophy, Clock, CheckCircle2, DollarSign,
  ChevronRight, AlertTriangle,
} from "lucide-react";
import { StatCard }        from "@/components/ui/stat-card";
import { BatchPayButton }  from "@/components/rewards/batch-pay-button";
import { formatCurrency, formatDate, truncate } from "@/lib/utils";
import type { Metadata }   from "next";
import type { RewardStatus } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Rewards" };

const STATUS_CFG: Record<RewardStatus, { label: string; cls: string }> = {
  pending:  { label: "Pending",  cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
  approved: { label: "Approved", cls: "text-teal-400 bg-teal-950/50 border-teal-900/50" },
  paid:     { label: "Paid",     cls: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50" },
  declined: { label: "Declined", cls: "text-red-400 bg-red-950/50 border-red-900/50" },
};

interface Props { searchParams: { status?: string } }

export default async function OrgRewardsPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile?.org_id) redirect("/dashboard/org");

  let q = supabase
    .from("rewards")
    .select(`
      id, amount, currency, status, created_at, approved_at, paid_at,
      submissions(id, title),
      profiles!rewards_researcher_id_fkey(full_name, username)
    `)
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  if (searchParams.status) q = q.eq("status", searchParams.status);

  const { data: rewards } = await q;

  const all = rewards ?? [];
  const totals = {
    pending:  all.filter((r) => r.status === "pending").length,
    approved: all.filter((r) => r.status === "approved"),
    paid:     all.filter((r) => r.status === "paid"),
  };
  const totalPaidAmount    = totals.paid.reduce((s, r) => s + r.amount, 0);
  const totalApprovedAmount= totals.approved.reduce((s, r) => s + r.amount, 0);

  const TABS = [
    { label: "All",       value: undefined },
    { label: "Pending",   value: "pending"  },
    { label: "Approved",  value: "approved" },
    { label: "Paid",      value: "paid"     },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Rewards</h1>
          <p className="text-sm text-vault-muted mt-0.5">Manage reward proposals and payments</p>
        </div>
        <div className="flex items-center gap-3">
          <BatchPayButton approvedRewardIds={totals.approved.map((r) => r.id)} />
          <Link href="/dashboard/org/payouts" className="text-xs text-vault-teal hover:underline flex items-center gap-1">
            View payout audit log →
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Approval"
          value={totals.pending}
          icon={<Clock className="w-4 h-4" />}
          accent="amber"
        />
        <StatCard
          label="Approved (unpaid)"
          value={formatCurrency(totalApprovedAmount)}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="teal"
        />
        <StatCard
          label="Total Paid"
          value={formatCurrency(totalPaidAmount)}
          icon={<DollarSign className="w-4 h-4" />}
          accent="green"
        />
        <StatCard
          label="Total Rewards"
          value={all.length}
          icon={<Trophy className="w-4 h-4" />}
          accent="blue"
        />
      </div>

      {/* Pending alert */}
      {totals.pending > 0 && !searchParams.status && (
        <div className="vault-card p-4 border-yellow-900/50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
            <p className="text-sm text-vault-muted">
              <span className="text-yellow-400 font-medium">{totals.pending} reward{totals.pending !== 1 ? "s" : ""}</span>{" "}
              awaiting your human approval. AI cannot approve these — only you can.
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-vault-elevated border border-vault-border rounded-lg p-1 w-fit">
        {TABS.map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `?status=${value}` : "?"}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              (searchParams.status ?? undefined) === value
                ? "bg-vault-surface text-vault-text border border-vault-border"
                : "text-vault-muted hover:text-vault-text"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* List */}
      {all.length === 0 ? (
        <div className="vault-card flex flex-col items-center justify-center py-16 text-center">
          <Trophy className="w-8 h-8 text-vault-muted mb-3 opacity-50" />
          <p className="font-medium mb-1">No rewards yet</p>
          <p className="text-sm text-vault-muted">
            Propose a reward from any accepted submission
          </p>
        </div>
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {all.map((r) => {
            const cfg = STATUS_CFG[r.status as RewardStatus];
            const sub = Array.isArray(r.submissions) ? r.submissions[0] : r.submissions;
            const researcher = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            return (
              <Link
                key={r.id}
                href={`/dashboard/org/submissions/${sub?.id}`}
                className="flex items-center gap-4 p-4 hover:bg-vault-elevated/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-vault-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                    {truncate(sub?.title ?? "Unknown submission", 55)}
                  </p>
                  <p className="text-xs text-vault-muted mt-0.5">
                    {researcher?.full_name ?? researcher?.username ?? "Anonymous"} · {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(r.amount, r.currency)}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.cls}`}>
                    {cfg.label}
                  </span>
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

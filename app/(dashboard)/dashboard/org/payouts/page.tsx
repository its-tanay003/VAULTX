import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import Link              from "next/link";
import { ScrollText, CheckCircle2, XCircle, Split, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { FraudFlagsPanel } from "@/components/payouts/fraud-flags-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payout Audit Log" };

const ACTION_CFG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  "reward.proposed":              { label: "Reward proposed",        icon: <ScrollText className="w-3.5 h-3.5" />,   cls: "text-vault-muted" },
  "reward.approved":              { label: "Reward approved",        icon: <CheckCircle2 className="w-3.5 h-3.5" />, cls: "text-teal-400" },
  "reward.declined":              { label: "Reward declined",        icon: <XCircle className="w-3.5 h-3.5" />,      cls: "text-red-400" },
  "reward.payout_succeeded":      { label: "Payout succeeded",       icon: <CheckCircle2 className="w-3.5 h-3.5" />, cls: "text-emerald-400" },
  "reward.payout_failed":         { label: "Payout failed",          icon: <XCircle className="w-3.5 h-3.5" />,      cls: "text-red-400" },
  "reward.split_configured":      { label: "Split configured",       icon: <Split className="w-3.5 h-3.5" />,        cls: "text-blue-400" },
  "reward.split_payout_attempted":{ label: "Split payout attempted", icon: <Split className="w-3.5 h-3.5" />,        cls: "text-blue-400" },
};

/**
 * Every action here is read directly from audit_logs (migration 001,
 * append-only, mutation-blocking triggers) — this page adds no new
 * logging mechanism, just a payout-focused view over data that was
 * already being written by rewards.ts on every propose/approve/
 * decline/payout action, with actor + timestamp already captured.
 */
export default async function PayoutAuditLogPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!profile?.org_id && profile?.role !== "admin") redirect("/dashboard/org");

  const { data: entries } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_id, after, ip, created_at, profiles!audit_logs_actor_id_fkey(full_name, username)")
    .eq("entity", "rewards")
    .like("action", "reward.%")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: fraudFlagsRaw } = await supabase
    .from("payout_fraud_flags")
    .select("id, researcher_id, flag_type, detail, created_at, profiles!payout_fraud_flags_researcher_id_fkey(full_name, username)")
    .eq("resolved", false)
    .order("created_at", { ascending: false });

  const fraudFlags = (fraudFlagsRaw ?? []).map((f) => {
    const researcher = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
    return {
      id: f.id, researcher_id: f.researcher_id, flag_type: f.flag_type,
      detail: f.detail as Record<string, unknown>, created_at: f.created_at,
      researcherName: researcher?.full_name ?? researcher?.username ?? "Unknown",
    };
  });

  const all = entries ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in">
      <div>
        <Link href="/dashboard/org/rewards" className="text-xs text-vault-muted hover:text-vault-text flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" /> Back to Rewards
        </Link>
        <h1 className="text-xl font-semibold">Payout Audit Log</h1>
        <p className="text-sm text-vault-muted mt-0.5">
          Every reward action — proposal, approval, decline, and payout — with who did it and when.
          Sourced from the platform's immutable, append-only audit log.
        </p>
      </div>

      <FraudFlagsPanel flags={fraudFlags} />

      {all.length === 0 ? (
        <div className="vault-card flex flex-col items-center justify-center py-16 text-center">
          <ScrollText className="w-8 h-8 text-vault-muted mb-3 opacity-50" />
          <p className="font-medium mb-1">No reward activity yet</p>
        </div>
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {all.map((entry) => {
            const cfg = ACTION_CFG[entry.action] ?? { label: entry.action, icon: <ScrollText className="w-3.5 h-3.5" />, cls: "text-vault-muted" };
            const actor = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
            const after = (entry.after as Record<string, unknown>) ?? {};

            return (
              <div key={entry.id} className="p-4 flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg bg-vault-elevated border border-vault-border flex items-center justify-center shrink-0 ${cfg.cls}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${cfg.cls}`}>{cfg.label}</p>
                    <span className="text-xs text-vault-muted">
                      by {actor?.full_name ?? actor?.username ?? "Unknown"}
                    </span>
                  </div>
                  {Boolean(after.reason) && <p className="text-xs text-red-300 mt-1">{String(after.reason)}</p>}
                  {Boolean(after.stripe_transfer_id) && (
                    <p className="text-xs text-vault-muted mt-1 font-mono">
                      Transfer: {String(after.stripe_transfer_id)}
                    </p>
                  )}
                  {after.total !== undefined && Boolean(after.currency) && (
                    <p className="text-xs text-vault-muted mt-1">
                      {String(after.total)} {String(after.currency)}
                    </p>
                  )}
                  <p className="text-[11px] text-vault-muted mt-1">{formatDate(entry.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

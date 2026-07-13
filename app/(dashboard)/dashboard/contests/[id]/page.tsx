import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import {
  ChevronLeft, Scale, GitBranch, DollarSign, Users, Bug,
  ExternalLink, Calendar, CheckCircle2, XCircle,
} from "lucide-react";
import { ContestStatusControl, FinalizeButton } from "@/components/contests/contest-status-control";
import { PayoutTable }          from "@/components/contests/payout-table";
import { computeContestStats }  from "@/lib/ai/contest-distribution";
import { formatDate, formatCurrency, truncate } from "@/lib/utils";
import type { Metadata } from "next";
import { VaultContextSetter } from "@/components/vault/vault-context-setter";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const supabase = createClient();
  const { data } = await supabase.from("audit_contests").select("title").eq("id", params.id).single();
  return { title: data?.title ?? "Contest" };
}

const SEV_CFG: Record<string, { cls: string; label: string }> = {
  critical: { label: "Critical", cls: "text-red-400 bg-red-950/50 border-red-900/50"          },
  high:     { label: "High",     cls: "text-orange-400 bg-orange-950/50 border-orange-900/50" },
  medium:   { label: "Medium",   cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
  low:      { label: "Low",      cls: "text-blue-400 bg-blue-950/50 border-blue-900/50"       },
  info:     { label: "Info",     cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"       },
};

const FIND_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Pending",   cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
  valid:     { label: "Valid",     cls: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50" },
  invalid:   { label: "Invalid",   cls: "text-red-400 bg-red-950/50 border-red-900/50"            },
  duplicate: { label: "Duplicate", cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"         },
};

export default async function ContestDetailPage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contest } = await supabase
    .from("audit_contests")
    .select("*, organizations(name, owner_id)")
    .eq("id", params.id)
    .single();

  if (!contest) notFound();
  const org = Array.isArray(contest.organizations) ? contest.organizations[0] : contest.organizations;
  if (org?.owner_id !== user.id) notFound();

  const { data: findings } = await supabase
    .from("contest_findings")
    .select(`*, profiles!contest_findings_auditor_id_fkey(full_name, username)`)
    .eq("contest_id", params.id)
    .order("created_at", { ascending: false });

  const { data: payouts } = await supabase
    .from("contest_payouts")
    .select(`*, profiles!contest_payouts_auditor_id_fkey(full_name, username)`)
    .eq("contest_id", params.id)
    .order("payout_amount", { ascending: false });

  const allFindings = findings ?? [];
  const stats = computeContestStats(allFindings);
  const unjudgedCount = allFindings.filter((f) => f.status === "submitted").length;

  const [, owner, repo] = contest.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/i) ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in">
      <VaultContextSetter page="contest_detail" contestId={contest.id} />
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/contests" className="text-vault-muted hover:text-vault-text transition-colors mt-1">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="w-4 h-4 text-vault-teal" /> {contest.title}
          </h1>
          <p className="text-sm text-vault-muted mt-1 flex items-center gap-3 flex-wrap">
            {owner && repo && (
              <a href={contest.repo_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-vault-teal hover:underline">
                <GitBranch className="w-3.5 h-3.5" /> {owner}/{repo} <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(contest.starts_at)} – {formatDate(contest.ends_at)}
            </span>
            <span className="flex items-center gap-1 text-vault-teal font-medium">
              <DollarSign className="w-3.5 h-3.5" />
              {formatCurrency(Number(contest.pool_amount), contest.pool_currency)} pool
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {contest.status === "judging" && (
            <Link href={`/dashboard/contests/${params.id}/judge`} className="btn-teal text-sm">
              Judge Findings
            </Link>
          )}
          <ContestStatusControl contestId={params.id} currentStatus={contest.status} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MiniStat icon={<Bug className="w-4 h-4" />}          label="Total Findings" value={stats.totalFindings} />
        <MiniStat icon={<CheckCircle2 className="w-4 h-4" />} label="Valid"          value={stats.validFindings}   accent="green" />
        <MiniStat icon={<XCircle className="w-4 h-4" />}      label="Invalid"        value={stats.invalidFindings} accent="red" />
        <MiniStat icon={<Bug className="w-4 h-4" />}          label="Duplicates"     value={stats.duplicateFindings} />
        <MiniStat icon={<Users className="w-4 h-4" />}        label="Auditors"       value={stats.uniqueAuditors} accent="teal" />
      </div>

      {/* Judging phase: finalize button when all judged */}
      {contest.status === "judging" && (
        <div className="vault-card p-4 border-vault-teal/20">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium">
                {unjudgedCount > 0
                  ? `${unjudgedCount} finding${unjudgedCount !== 1 ? "s" : ""} still need judging`
                  : "All findings judged — ready to finalize distribution"}
              </p>
              <p className="text-xs text-vault-muted mt-0.5">
                Finalizing computes payouts and marks the contest as complete
              </p>
            </div>
            <FinalizeButton
              contestId={params.id}
              disabled={unjudgedCount > 0}
            />
          </div>
        </div>
      )}

      {/* Payout table (complete contests) */}
      {contest.status === "complete" && payouts && payouts.length > 0 && (
        <PayoutTable payouts={payouts} poolAmount={Number(contest.pool_amount)} currency={contest.pool_currency} />
      )}

      {/* Findings list */}
      <div className="vault-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">
            Findings ({allFindings.length})
          </h2>
          {contest.status === "judging" && unjudgedCount > 0 && (
            <Link href={`/dashboard/contests/${params.id}/judge`} className="text-xs text-vault-teal hover:underline">
              Judge {unjudgedCount} pending →
            </Link>
          )}
        </div>

        {allFindings.length === 0 ? (
          <p className="text-sm text-vault-muted text-center py-8">No findings submitted yet</p>
        ) : (
          <div className="divide-y divide-vault-border">
            {allFindings.map((f) => {
              const sevCfg  = SEV_CFG[f.confirmed_severity ?? f.severity] ?? SEV_CFG.info;
              const statCfg = FIND_STATUS_CFG[f.status] ?? FIND_STATUS_CFG.submitted;
              const auditor = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;

              return (
                <div key={f.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sevCfg.cls}`}>
                          {sevCfg.label}
                        </span>
                        <p className="text-sm font-medium truncate">{f.title}</p>
                      </div>
                      <p className="text-xs text-vault-muted">
                        {auditor?.full_name ?? auditor?.username ?? "Anonymous"}
                        {f.payout_amount ? ` · ${formatCurrency(Number(f.payout_amount), contest.pool_currency)}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${statCfg.cls}`}>
                      {statCfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, accent = "teal" }: { icon: React.ReactNode; label: string; value: number; accent?: "teal"|"green"|"red" }) {
  const colors = { teal: "text-teal-400 bg-teal-950/50 border-teal-900/40", green: "text-green-400 bg-green-950/50 border-green-900/40", red: "text-red-400 bg-red-950/50 border-red-900/40" };
  return (
    <div className="vault-card p-3.5 text-center">
      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center mx-auto mb-2 ${colors[accent]}`}>{icon}</div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-vault-muted">{label}</p>
    </div>
  );
}

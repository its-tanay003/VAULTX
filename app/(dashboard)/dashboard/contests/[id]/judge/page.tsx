import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import { ChevronLeft, Scale, Sparkles } from "lucide-react";
import { JudgePanel }         from "@/components/contests/judge-panel";
import { AIDuplicatePanel }   from "@/components/contests/ai-duplicate-panel";
import type { Metadata }      from "next";

interface Props { params: { id: string } }
export const metadata: Metadata = { title: "Judge Contest" };

const SEV_CFG: Record<string, { cls: string; label: string }> = {
  critical: { label: "Critical", cls: "text-red-400 bg-red-950/50 border-red-900/50"          },
  high:     { label: "High",     cls: "text-orange-400 bg-orange-950/50 border-orange-900/50" },
  medium:   { label: "Medium",   cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
  low:      { label: "Low",      cls: "text-blue-400 bg-blue-950/50 border-blue-900/50"       },
  info:     { label: "Info",     cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"       },
};

export default async function JudgePage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contest } = await supabase
    .from("audit_contests")
    .select("*, organizations(owner_id)")
    .eq("id", params.id)
    .single();

  if (!contest) notFound();
  const org = Array.isArray(contest.organizations) ? contest.organizations[0] : contest.organizations;
  if (org?.owner_id !== user.id) notFound();
  if (!["judging", "complete"].includes(contest.status)) redirect(`/dashboard/contests/${params.id}`);

  const { data: findings } = await supabase
    .from("contest_findings")
    .select(`*, profiles!contest_findings_auditor_id_fkey(full_name, username)`)
    .eq("contest_id", params.id)
    .order("severity", { ascending: true }) // critical first (reversed alphabetical happens to work: c < h < i < l < m)
    .order("created_at", { ascending: true });

  const allFindings = findings ?? [];
  const pending     = allFindings.filter((f) => f.status === "submitted");
  const judged      = allFindings.filter((f) => f.status !== "submitted");

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/contests/${params.id}`} className="text-vault-muted hover:text-vault-text transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Scale className="w-5 h-5 text-vault-teal" /> Judge Findings
            </h1>
            <p className="text-sm text-vault-muted">{contest.title}</p>
          </div>
        </div>
        <div className="text-sm text-vault-muted">
          <span className="text-vault-text font-medium">{pending.length}</span> pending ·{" "}
          <span className="text-vault-text font-medium">{judged.length}</span> judged ·{" "}
          <span className="text-vault-text font-medium">{allFindings.length}</span> total
        </div>
      </div>

      {/* AI duplicate suggestions — loads client-side after mount */}
      {pending.length >= 2 && (
        <AIDuplicatePanel contestId={params.id} />
      )}

      {/* Pending findings */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-yellow-400 mb-2 flex items-center gap-1.5">
            Pending ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((f) => {
              const sevCfg  = SEV_CFG[f.severity] ?? SEV_CFG.info;
              const auditor = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
              return (
                <JudgePanel
                  key={f.id}
                  finding={{
                    id:                f.id,
                    contestId:         params.id,
                    title:             f.title,
                    description:       f.description,
                    stepsToReproduce:  f.steps_to_reproduce,
                    impact:            f.impact,
                    suggestedFix:      f.suggested_fix,
                    affectedFiles:     f.affected_files,
                    severity:          f.severity,
                    status:            f.status,
                    auditorName:       auditor?.full_name ?? auditor?.username ?? "Anonymous",
                  }}
                  allFindingIds={allFindings.map((f) => ({ id: f.id, title: f.title }))}
                  sevConfig={sevCfg}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Already judged */}
      {judged.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-vault-muted mb-2">
            Judged ({judged.length})
          </h2>
          <div className="vault-card divide-y divide-vault-border">
            {judged.map((f) => {
              const sevCfg  = SEV_CFG[f.confirmed_severity ?? f.severity] ?? SEV_CFG.info;
              const auditor = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
              const STATUS_CLS: Record<string, string> = {
                valid: "text-emerald-400", invalid: "text-red-400", duplicate: "text-zinc-400",
              };
              return (
                <div key={f.id} className="flex items-center gap-3 p-3.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sevCfg.cls} shrink-0`}>
                    {sevCfg.label}
                  </span>
                  <p className="text-sm flex-1 truncate">{f.title}</p>
                  <p className="text-xs text-vault-muted shrink-0">{auditor?.username ?? "Anonymous"}</p>
                  <span className={`text-xs font-medium capitalize shrink-0 ${STATUS_CLS[f.status] ?? "text-vault-muted"}`}>
                    {f.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

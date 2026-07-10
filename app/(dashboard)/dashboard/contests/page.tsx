import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import Link               from "next/link";
import {
  Scale, Plus, GitBranch, DollarSign, Calendar, ChevronRight, Users,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit Contests" };

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  draft:    { label: "Draft",    cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"           },
  open:     { label: "Open",     cls: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50"  },
  judging:  { label: "Judging",  cls: "text-violet-400 bg-violet-950/50 border-violet-900/50"     },
  complete: { label: "Complete", cls: "text-teal-400 bg-teal-950/50 border-teal-900/50"           },
  archived: { label: "Archived", cls: "text-zinc-500 bg-zinc-900/50 border-zinc-800/50"           },
};

export default async function ContestsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();

  const isOrg = profile?.role === "org" && profile.org_id;

  let q = supabase
    .from("audit_contests")
    .select("id, title, pool_amount, pool_currency, status, starts_at, ends_at, repo_url, contest_findings(auditor_id)")
    .order("starts_at", { ascending: false });

  q = isOrg
    ? q.eq("org_id", profile.org_id)
    : q.eq("is_public", true).in("status", ["open", "judging", "complete"]);

  const { data: contests } = await q;
  const items = contests ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Scale className="w-5 h-5 text-vault-teal" /> Audit Contests
          </h1>
          <p className="text-sm text-vault-muted mt-0.5">
            {isOrg
              ? "Time-boxed competitive audits with pool-based rewards"
              : "Compete to find vulnerabilities and share the reward pool"}
          </p>
        </div>
        {isOrg && (
          <Link href="/dashboard/contests/new" className="btn-teal flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Contest
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Scale className="w-6 h-6" />}
          title={isOrg ? "No contests yet" : "No open contests"}
          description={isOrg
            ? "Create a time-boxed audit contest with a reward pool. Multiple auditors compete to find bugs — better finds earn a larger share."
            : "Public audit contests will appear here when they open."}
          action={isOrg ? { href: "/dashboard/contests/new", label: "Create contest" } : undefined}
        />
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {items.map((contest) => {
            const cfg = STATUS_CFG[contest.status] ?? STATUS_CFG.draft;
            const auditorCount = new Set(
              (Array.isArray(contest.contest_findings) ? contest.contest_findings : [])
                .map((f) => f.auditor_id)
            ).size;
            const [, owner, repo] = contest.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/i) ?? [];

            return (
              <Link
                key={contest.id}
                href={isOrg ? `/dashboard/contests/${contest.id}` : `/dashboard/contests/${contest.id}/submit`}
                className="flex items-center gap-4 p-4 hover:bg-vault-elevated/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4 text-vault-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                    {contest.title}
                  </p>
                  <p className="text-xs text-vault-muted mt-0.5 flex items-center gap-2 flex-wrap">
                    {owner && repo && (
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" /> {owner}/{repo}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(contest.starts_at)} – {formatDate(contest.ends_at)}
                    </span>
                    {auditorCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {auditorCount} auditor{auditorCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-semibold text-vault-teal flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    {formatCurrency(Number(contest.pool_amount), contest.pool_currency)}
                  </p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>
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

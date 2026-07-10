import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import Link               from "next/link";
import {
  Code2, GitBranch, Plus, ChevronRight, CheckCircle2,
  AlertTriangle, Clock, Loader2,
} from "lucide-react";
import { ConnectRepoForm } from "@/components/code-quality/connect-repo-form";
import { formatRelativeTime } from "@/lib/utils";
import type { Metadata }   from "next";

export const metadata: Metadata = { title: "Code Quality" };

function scoreColor(score: number | null): string {
  if (score === null)  return "text-vault-muted";
  if (score >= 80)     return "text-emerald-400";
  if (score >= 60)     return "text-yellow-400";
  return "text-red-400";
}

export default async function CodeQualityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("org_id, role").eq("id", user.id).single();

  const isOrg = ["org","triager","admin"].includes(profile?.role ?? "") && profile?.org_id;

  let q = supabase
    .from("code_repos")
    .select(`
      id, github_url, owner_name, repo_name, last_scanned_at, created_at,
      code_scans(id, status, score, created_at)
    `)
    .order("created_at", { ascending: false });

  q = isOrg ? q.eq("org_id", profile.org_id) : q.eq("profile_id", user.id);

  const { data: repos } = await q;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Code2 className="w-5 h-5 text-vault-teal" /> Code Quality
        </h1>
        <p className="text-sm text-vault-muted mt-0.5">
          AI-powered static analysis for public GitHub repositories
        </p>
      </div>

      <ConnectRepoForm />

      {/* Connected repos */}
      {!repos?.length ? (
        <div className="vault-card flex flex-col items-center justify-center py-16 text-center">
          <GitBranch className="w-8 h-8 text-vault-muted mb-3 opacity-50" />
          <p className="font-medium mb-1">No repositories connected</p>
          <p className="text-sm text-vault-muted">
            Connect a public GitHub repo above to run your first scan
          </p>
        </div>
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {repos.map((repo) => {
            const scans       = Array.isArray(repo.code_scans) ? repo.code_scans : [];
            const latestScan  = scans.sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];

            return (
              <Link
                key={repo.id}
                href={`/dashboard/code-quality/${repo.id}`}
                className="flex items-center gap-4 p-4 hover:bg-vault-elevated/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-vault-elevated border border-vault-border flex items-center justify-center shrink-0">
                  <GitBranch className="w-4 h-4 text-vault-subtle" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                    {repo.owner_name}/{repo.repo_name}
                  </p>
                  <p className="text-xs text-vault-muted mt-0.5">
                    {repo.last_scanned_at
                      ? `Last scanned ${formatRelativeTime(repo.last_scanned_at)}`
                      : "Never scanned"}
                  </p>
                </div>

                {/* Status / score */}
                <div className="flex items-center gap-2 shrink-0">
                  {latestScan?.status === "running" && (
                    <span className="flex items-center gap-1.5 text-xs text-vault-muted">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning…
                    </span>
                  )}
                  {latestScan?.status === "failed" && (
                    <span className="flex items-center gap-1.5 text-xs text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                  {latestScan?.status === "complete" && latestScan.score !== null && (
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${scoreColor(latestScan.score)}`}>
                        {latestScan.score}
                      </p>
                      <p className="text-[10px] text-vault-muted">score</p>
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

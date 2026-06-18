import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import {
  ChevronLeft, Github, RotateCcw, ExternalLink,
  AlertTriangle, Shield, Zap, FileCode, Trash2,
} from "lucide-react";
import { RescanButton }      from "@/components/code-quality/rescan-button";
import { formatRelativeTime } from "@/lib/utils";
import type { Metadata }     from "next";
import type { CodeFinding }  from "@/lib/ai/code-review";

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from("code_repos").select("repo_name").eq("id", params.id).single();
  return { title: data?.repo_name ?? "Repository" };
}

const SEV_CFG: Record<string, { cls: string; icon: React.ReactNode }> = {
  critical: { cls: "text-red-400 bg-red-950/50 border-red-900/50",         icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  high:     { cls: "text-orange-400 bg-orange-950/50 border-orange-900/50", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  medium:   { cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  low:      { cls: "text-blue-400 bg-blue-950/50 border-blue-900/50",       icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  info:     { cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50",       icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  security:      <Shield   className="w-3.5 h-3.5 text-red-400"    />,
  performance:   <Zap      className="w-3.5 h-3.5 text-yellow-400" />,
  quality:       <FileCode className="w-3.5 h-3.5 text-blue-400"   />,
  "anti-pattern":<FileCode className="w-3.5 h-3.5 text-orange-400" />,
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

function scoreRing(score: number): string {
  if (score >= 80) return "stroke-emerald-400";
  if (score >= 60) return "stroke-yellow-400";
  return "stroke-red-400";
}

export default async function CodeScanDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: repo } = await supabase
    .from("code_repos")
    .select(`
      *,
      code_scans(id, status, score, summary, findings, files_scanned, error, created_at, completed_at)
    `)
    .eq("id", params.id)
    .single();

  if (!repo) notFound();

  const scans = (Array.isArray(repo.code_scans) ? repo.code_scans : [])
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latest = scans[0];

  const findings = (latest?.findings ?? []) as CodeFinding[];
  const severityOrder = ["critical","high","medium","low","info"];
  const sortedFindings = [...findings].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  const circumference = 2 * Math.PI * 36;
  const scoreOffset = latest?.score != null
    ? circumference - (latest.score / 100) * circumference
    : circumference;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/code-quality" className="text-vault-muted hover:text-vault-text transition-colors mt-1">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Github className="w-4 h-4 text-vault-muted" />
              {repo.owner_name}/{repo.repo_name}
            </h1>
            <p className="text-sm text-vault-muted mt-0.5 flex items-center gap-2">
              <a
                href={repo.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-vault-teal hover:underline flex items-center gap-1"
              >
                View on GitHub <ExternalLink className="w-3 h-3" />
              </a>
              {repo.last_scanned_at && (
                <>· Last scanned {formatRelativeTime(repo.last_scanned_at)}</>
              )}
            </p>
          </div>
        </div>

        <RescanButton repoId={repo.id} isScanning={latest?.status === "running"} />
      </div>

      {/* Scan status */}
      {latest?.status === "running" && (
        <div className="vault-card p-8 text-center">
          <div className="w-10 h-10 border-2 border-vault-teal/30 border-t-vault-teal rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium">AI is analyzing the repository…</p>
          <p className="text-xs text-vault-muted mt-1">This usually takes 10-20 seconds</p>
        </div>
      )}

      {latest?.status === "failed" && (
        <div className="vault-card p-5 border-red-900/50">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400 mb-1">Scan failed</p>
              <p className="text-xs text-vault-muted">{latest.error ?? "Unknown error occurred"}</p>
            </div>
          </div>
        </div>
      )}

      {latest?.status === "complete" && (
        <>
          {/* Score card */}
          <div className="vault-card p-6">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#27272a" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="36" fill="none"
                    className={scoreRing(latest.score ?? 0)}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={scoreOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${scoreColor(latest.score ?? 0)}`}>
                    {latest.score}
                  </span>
                  <span className="text-[10px] text-vault-muted">/ 100</span>
                </div>
              </div>

              <div className="flex-1">
                <h2 className="text-sm font-medium mb-2">AI Quality Summary</h2>
                <p className="text-sm text-vault-muted leading-relaxed">{latest.summary}</p>
                <p className="text-xs text-vault-muted mt-3">
                  {latest.files_scanned} file{latest.files_scanned !== 1 ? "s" : ""} scanned ·{" "}
                  {findings.length} finding{findings.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Findings */}
          {sortedFindings.length === 0 ? (
            <div className="vault-card p-8 text-center">
              <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-3 opacity-80" />
              <p className="text-sm font-medium">No significant issues found</p>
              <p className="text-xs text-vault-muted mt-1">The scanned files look clean</p>
            </div>
          ) : (
            <div className="vault-card divide-y divide-vault-border">
              <div className="p-4 border-b border-vault-border">
                <h2 className="text-sm font-medium">Findings ({sortedFindings.length})</h2>
              </div>
              {sortedFindings.map((finding, i) => {
                const sevCfg = SEV_CFG[finding.severity] ?? SEV_CFG.info;
                return (
                  <div key={i} className="p-4 flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${sevCfg.cls}`}>
                      {sevCfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${sevCfg.cls}`}>
                          {finding.severity}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-vault-muted">
                          {CATEGORY_ICONS[finding.category]}
                          {finding.category}
                        </span>
                      </div>
                      <p className="text-sm text-vault-text leading-relaxed">{finding.message}</p>
                      <p className="text-xs text-vault-muted font-mono mt-1.5">
                        {finding.file}{finding.line ? `:${finding.line}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

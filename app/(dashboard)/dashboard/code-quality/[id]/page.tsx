import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import {
  ChevronLeft, Github, ExternalLink, AlertTriangle,
  Shield, Zap, FileCode, Code2,
} from "lucide-react";
import { RescanButton }      from "@/components/code-quality/rescan-button";
import { Web3AuditButton }   from "@/components/code-quality/web3-audit-button";
import { formatRelativeTime } from "@/lib/utils";
import type { Metadata }     from "next";
import type { CodeFinding }  from "@/lib/ai/code-review";
import type { SmartContractFinding } from "@/lib/ai/smart-contract-audit";

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from("code_repos").select("repo_name").eq("id", params.id).single();
  return { title: data?.repo_name ?? "Repository" };
}

const SEV_CFG: Record<string, { cls: string }> = {
  critical: { cls: "text-red-400 bg-red-950/50 border-red-900/50"          },
  high:     { cls: "text-orange-400 bg-orange-950/50 border-orange-900/50" },
  medium:   { cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
  low:      { cls: "text-blue-400 bg-blue-950/50 border-blue-900/50"       },
  info:     { cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"       },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  security:          <Shield   className="w-3.5 h-3.5 text-red-400"    />,
  performance:       <Zap      className="w-3.5 h-3.5 text-yellow-400" />,
  quality:           <FileCode className="w-3.5 h-3.5 text-blue-400"   />,
  "anti-pattern":    <FileCode className="w-3.5 h-3.5 text-orange-400" />,
  "Reentrancy":      <AlertTriangle className="w-3.5 h-3.5 text-red-400"    />,
  "Access Control":  <Shield   className="w-3.5 h-3.5 text-orange-400" />,
  "Oracle Manipulation": <Zap  className="w-3.5 h-3.5 text-yellow-400" />,
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
    .select(`*, code_scans(id, status, scan_type, score, summary, findings, files_scanned, error, created_at, completed_at)`)
    .eq("id", params.id)
    .single();

  if (!repo) notFound();

  const scansArray = (repo.code_scans ?? []) as Array<{
    id: string;
    status: string;
    scan_type: string;
    score: number;
    summary: string;
    findings: any;
    files_scanned: number;
    error: string | null;
    created_at: string;
    completed_at: string | null;
  }>;

  const allScans = [...scansArray].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Latest general scan + latest web3 scan shown separately
  const latestGeneral = allScans.find((s) => s.scan_type === "general" || !s.scan_type) ?? null;
  const latestWeb3    = allScans.find((s) => s.scan_type === "web3_smart_contract") ?? null;

  // Active tab: whichever has a more recent complete scan, or show both
  const activeTab = (latestWeb3?.completed_at ?? "") > (latestGeneral?.completed_at ?? "")
    ? "web3"
    : "general";

  const circumference = 2 * Math.PI * 36;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in">
      {/* Header */}
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
              <a href={repo.github_url} target="_blank" rel="noopener noreferrer"
                className="text-vault-teal hover:underline flex items-center gap-1">
                View on GitHub <ExternalLink className="w-3 h-3" />
              </a>
              {repo.last_scanned_at && <>· Last scanned {formatRelativeTime(repo.last_scanned_at)}</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Web3AuditButton repoId={repo.id} isRunning={latestWeb3?.status === "running"} />
          <RescanButton repoId={repo.id} isScanning={latestGeneral?.status === "running"} />
        </div>
      </div>

      {/* Tab switcher when both scan types exist */}
      {latestWeb3 && latestGeneral && (
        <div className="flex items-center gap-1 bg-vault-elevated border border-vault-border rounded-lg p-1 w-fit">
          <Link
            href={`/dashboard/code-quality/${params.id}?tab=general`}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "general"
                ? "bg-vault-surface text-vault-text border border-vault-border"
                : "text-vault-muted hover:text-vault-text"
            }`}
          >
            Code Quality
          </Link>
          <Link
            href={`/dashboard/code-quality/${params.id}?tab=web3`}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "web3"
                ? "bg-vault-surface text-vault-text border border-vault-border"
                : "text-vault-muted hover:text-vault-text"
            }`}
          >
            <Shield className="w-3 h-3 text-vault-teal" /> Web3 Audit
          </Link>
        </div>
      )}

      {/* General scan results */}
      {(activeTab === "general" || !latestWeb3) && latestGeneral && (
        <ScanResultPanel
          scan={latestGeneral}
          circumference={circumference}
          isWeb3={false}
        />
      )}

      {/* Web3 audit results */}
      {(activeTab === "web3" || !latestGeneral) && latestWeb3 && (
        <ScanResultPanel
          scan={latestWeb3}
          circumference={circumference}
          isWeb3={true}
        />
      )}

      {/* No scans yet */}
      {!latestGeneral && !latestWeb3 && (
        <div className="vault-card p-8 text-center">
          <Code2 className="w-8 h-8 text-vault-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium mb-1">No scans yet</p>
          <p className="text-xs text-vault-muted">Run a general code quality scan or a Web3 smart contract audit above</p>
        </div>
      )}
    </div>
  );
}

function ScanResultPanel({
  scan,
  circumference,
  isWeb3,
}: {
  scan: Record<string, unknown>;
  circumference: number;
  isWeb3: boolean;
}) {
  if (scan.status === "running") {
    return (
      <div className="vault-card p-8 text-center">
        <div className="w-10 h-10 border-2 border-vault-teal/30 border-t-vault-teal rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium">
          {isWeb3 ? "AI auditing smart contracts…" : "AI analyzing the repository…"}
        </p>
        <p className="text-xs text-vault-muted mt-1">
          {isWeb3 ? "Checking for reentrancy, access control, oracle issues, and more" : "Usually takes 10–20 seconds"}
        </p>
      </div>
    );
  }

  if (scan.status === "failed") {
    return (
      <div className="vault-card p-5 border-red-900/50">
        <div className="flex gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400 mb-1">
              {isWeb3 ? "Web3 audit failed" : "Scan failed"}
            </p>
            <p className="text-xs text-vault-muted">{scan.error as string ?? "Unknown error occurred"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (scan.status !== "complete") return null;

  const score  = scan.score as number;
  const scoreOffset = circumference - ((score ?? 0) / 100) * circumference;

  const findings = (scan.findings as unknown[]) ?? [];
  const severityOrder = ["critical", "high", "medium", "low", "info"];
  const sorted = [...findings].sort((a: unknown, b: unknown) => {
    const af = a as { severity: string };
    const bf = b as { severity: string };
    return severityOrder.indexOf(af.severity) - severityOrder.indexOf(bf.severity);
  });

  return (
    <>
      {/* Score card */}
      <div className="vault-card p-6">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#27272a" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="36" fill="none"
                className={scoreColor(score).replace("text-", "stroke-")}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={scoreOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
              <span className="text-[10px] text-vault-muted">/ 100</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-medium">
                {isWeb3 ? "Smart Contract Security Audit" : "Code Quality Analysis"}
              </h2>
              {isWeb3 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-vault-teal/10 text-vault-teal border border-vault-teal/20 rounded">
                  Web3
                </span>
              )}
            </div>
            <p className="text-sm text-vault-muted leading-relaxed">{scan.summary as string}</p>
            <p className="text-xs text-vault-muted mt-3">
              {scan.files_scanned as number} file{(scan.files_scanned as number) !== 1 ? "s" : ""} scanned ·{" "}
              {findings.length} finding{findings.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Findings */}
      {sorted.length === 0 ? (
        <div className="vault-card p-8 text-center">
          <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-3 opacity-80" />
          <p className="text-sm font-medium">No issues found</p>
          <p className="text-xs text-vault-muted mt-1">
            {isWeb3 ? "The audited contracts appear clean" : "The scanned files look healthy"}
          </p>
        </div>
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          <div className="p-4 border-b border-vault-border">
            <h2 className="text-sm font-medium">Findings ({sorted.length})</h2>
          </div>
          {sorted.map((raw, i) => {
            if (isWeb3) {
              const f = raw as SmartContractFinding;
              const sevCfg = SEV_CFG[f.severity] ?? SEV_CFG.info;
              return (
                <div key={i} className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${sevCfg.cls}`}>
                      {f.severity}
                    </span>
                    {f.swcId && (
                      <span className="text-[10px] text-vault-muted border border-vault-border rounded px-1.5 py-0.5">
                        {f.swcId}
                      </span>
                    )}
                    <span className="text-[10px] text-vault-muted">{f.category}</span>
                  </div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-vault-muted leading-relaxed">{f.description}</p>
                  {f.codeSnippet && (
                    <pre className="text-xs font-mono bg-vault-bg border border-vault-border rounded p-2.5 overflow-x-auto text-vault-subtle">
                      {f.codeSnippet}
                    </pre>
                  )}
                  <div className="text-xs text-vault-muted font-mono">
                    {f.file}{f.line ? `:${f.line}` : ""}
                  </div>
                  <div className="flex items-start gap-2 bg-vault-teal/5 border border-vault-teal/15 rounded p-2.5">
                    <Shield className="w-3.5 h-3.5 text-vault-teal shrink-0 mt-0.5" />
                    <p className="text-xs text-vault-muted leading-relaxed">{f.recommendation}</p>
                  </div>
                </div>
              );
            } else {
              const f = raw as CodeFinding;
              const sevCfg = SEV_CFG[f.severity] ?? SEV_CFG.info;
              return (
                <div key={i} className="p-4 flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${sevCfg.cls}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${sevCfg.cls}`}>
                        {f.severity}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-vault-muted">
                        {CATEGORY_ICONS[f.category] ?? null} {f.category}
                      </span>
                      {f.source && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                          f.source === "static"
                            ? "text-teal-400 bg-teal-950/30 border-teal-900/40"
                            : "text-violet-400 bg-violet-950/30 border-violet-900/40"
                        }`}>
                          {f.source === "static" ? "Static" : "AI"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-vault-text leading-relaxed">{f.message}</p>
                    <p className="text-xs text-vault-muted font-mono mt-1.5">
                      {f.file}{f.line ? `:${f.line}` : ""}
                    </p>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </>
  );
}

import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import { ChevronLeft, GitBranch, ExternalLink, Code2, Shield } from "lucide-react";
import { RescanButton }      from "@/components/code-quality/rescan-button";
import { Web3AuditButton }   from "@/components/code-quality/web3-audit-button";
import { OpenWorkspaceButton } from "@/components/workspace/open-workspace-button";
import { formatRelativeTime } from "@/lib/utils";
import type { Metadata }     from "next";
import { VaultContextSetter } from "@/components/vault/vault-context-setter";
import { ScanResultPanel }    from "@/components/code-quality/scan-result-panel";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const supabase = createClient();
  const { data } = await supabase.from("code_repos").select("repo_name").eq("id", params.id).single();
  return { title: data?.repo_name ?? "Repository" };
}

export default async function CodeScanDetailPage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: repo }, { data: workspace }] = await Promise.all([
    supabase
      .from("code_repos")
      .select(`*, code_scans(id, status, scan_type, score, summary, findings, files_scanned, error, created_at, completed_at)`)
      .eq("id", params.id)
      .single(),
    supabase
      .from("workspaces")
      .select("id")
      .eq("repo_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

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
    <div className="max-w-6xl mx-auto space-y-5 animate-in">
      <VaultContextSetter page="code_quality_detail" repoId={repo.id} />
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/code-quality" className="text-vault-muted hover:text-vault-text transition-colors mt-1">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-vault-muted" />
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
          <OpenWorkspaceButton repoId={repo.id} branch={repo.default_branch} existingWorkspaceId={workspace?.id} />
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
          repoId={repo.id}
        />
      )}

      {/* Web3 audit results */}
      {(activeTab === "web3" || !latestGeneral) && latestWeb3 && (
        <ScanResultPanel
          scan={latestWeb3}
          circumference={circumference}
          isWeb3={true}
          repoId={repo.id}
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

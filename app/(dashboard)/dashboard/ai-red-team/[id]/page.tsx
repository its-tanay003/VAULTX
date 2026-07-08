import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import {
  ChevronLeft, Zap, Github, FileText, Bug, ExternalLink,
} from "lucide-react";
import { RunScanButton }       from "@/components/red-team/run-scan-button";
import { TargetStatusToggle }  from "@/components/red-team/target-status-toggle";
import { AggressionBadge }     from "@/components/red-team/aggression-badge";
import { ReasoningTrace }      from "@/components/red-team/reasoning-trace";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import type { Metadata }       from "next";
import { VaultContextSetter } from "@/components/vault/vault-context-setter";

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from("red_team_targets").select("name").eq("id", params.id).single();
  return { title: data?.name ?? "Target" };
}

const SCAN_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  running:  { label: "Running",  cls: "text-violet-400 bg-violet-950/50 border-violet-900/50"    },
  complete: { label: "Complete", cls: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50"  },
  failed:   { label: "Failed",   cls: "text-red-400 bg-red-950/50 border-red-900/50"              },
};

export default async function TargetDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: target } = await supabase
    .from("red_team_targets")
    .select("*, organizations(owner_id)")
    .eq("id", params.id)
    .single();

  if (!target) notFound();
  const org = Array.isArray(target.organizations) ? target.organizations[0] : target.organizations;
  if (org?.owner_id !== user.id) notFound();

  const { data: scans } = await supabase
    .from("red_team_scans")
    .select("*")
    .eq("target_id", params.id)
    .order("started_at", { ascending: false })
    .limit(10);

  const items = scans ?? [];
  const latestScan = items[0] ?? null;

  // Load the actual submissions the latest scan generated, so the org
  // can jump straight into triaging them
  let latestFindings: { id: string; title: string; severity: string; status: string }[] = [];
  if (latestScan?.submission_ids?.length) {
    const { data: subs } = await supabase
      .from("submissions")
      .select("id, title, severity, status")
      .in("id", latestScan.submission_ids);
    latestFindings = subs ?? [];
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in">
      <VaultContextSetter page="red_team_target_detail" targetId={target.id} />
      <div className="flex items-start gap-3">
        <Link href="/dashboard/ai-red-team" className="text-vault-muted hover:text-vault-text transition-colors mt-1">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            {target.target_type === "github_repo"
              ? <Github className="w-4 h-4 text-vault-teal" />
              : <FileText className="w-4 h-4 text-vault-teal" />}
            {target.name}
          </h1>
          <p className="text-sm text-vault-muted mt-1 flex items-center gap-2 flex-wrap">
            <AggressionBadge level={target.aggression_level} />
            <span>·</span>
            <span>{target.last_scanned_at ? `Last scanned ${formatRelativeTime(target.last_scanned_at)}` : "Never scanned"}</span>
            {target.target_type === "github_repo" && (
              <a href={target.target_value} target="_blank" rel="noopener noreferrer" className="text-vault-teal hover:underline flex items-center gap-1">
                View repo <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TargetStatusToggle targetId={target.id} isActive={target.is_active} />
          <RunScanButton targetId={target.id} isRunning={latestScan?.status === "running"} />
        </div>
      </div>

      {target.target_type === "scope_description" && (
        <div className="vault-card p-5">
          <h2 className="text-[11px] font-medium text-vault-muted uppercase tracking-wide mb-2">Described Scope</h2>
          <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">{target.target_value}</p>
        </div>
      )}

      {/* Latest scan reasoning trace */}
      {latestScan?.status === "complete" && (
        <ReasoningTrace trace={latestScan.reasoning_trace} />
      )}

      {latestScan?.status === "failed" && (
        <div className="vault-card p-5 border-red-900/50">
          <p className="text-sm font-medium text-red-400 mb-1">Last scan failed</p>
          <p className="text-xs text-vault-muted">{latestScan.error}</p>
        </div>
      )}

      {/* Findings from latest scan, linking into the real triage queue */}
      {latestFindings.length > 0 && (
        <div className="vault-card p-5">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-3">
            <Bug className="w-4 h-4 text-vault-teal" /> Findings from latest scan
          </h2>
          <div className="divide-y divide-vault-border">
            {latestFindings.map((f) => (
              <Link
                key={f.id}
                href={`/dashboard/org/submissions/${f.id}`}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:text-vault-teal transition-colors group"
              >
                <span className="text-sm truncate">{f.title}</span>
                <span className="text-xs text-vault-muted shrink-0 capitalize">{f.severity} · {f.status}</span>
              </Link>
            ))}
          </div>
          <p className="text-[11px] text-vault-muted mt-3 pt-3 border-t border-vault-border">
            These are real submissions in your normal triage queue — accept, reject, or request more info exactly as you would for a human researcher&apos;s report.
          </p>
        </div>
      )}

      {/* Scan history */}
      <div className="vault-card p-5">
        <h2 className="text-sm font-medium mb-3">Scan History</h2>
        {items.length === 0 ? (
          <p className="text-sm text-vault-muted text-center py-4">No scans yet</p>
        ) : (
          <div className="divide-y divide-vault-border">
            {items.map((scan) => {
              const cfg = SCAN_STATUS_CFG[scan.status] ?? SCAN_STATUS_CFG.running;
              return (
                <div key={scan.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-xs text-vault-muted">{formatDate(scan.started_at)}</span>
                  <div className="flex items-center gap-2">
                    {scan.status === "complete" && (
                      <span className="text-xs text-vault-muted">{scan.findings_created} finding{scan.findings_created !== 1 ? "s" : ""}</span>
                    )}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.cls}`}>
                      {cfg.label}
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

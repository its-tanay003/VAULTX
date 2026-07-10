import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import Link               from "next/link";
import {
  Zap, Plus, GitBranch, FileText, ChevronRight, Clock, Bug,
} from "lucide-react";
import { EmptyState }    from "@/components/ui/empty-state";
import { AggressionBadge } from "@/components/red-team/aggression-badge";
import { formatRelativeTime } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "AI Red Team" };

export default async function AIRedTeamPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();

  if (profile?.role !== "org" || !profile.org_id) {
    // AI Red Team is org-only — researchers see findings through the
    // normal submissions queue (attributed to the AI agent), not here.
    redirect("/dashboard/researcher");
  }

  const { data: targets } = await supabase
    .from("red_team_targets")
    .select(`
      id, name, target_type, target_value, aggression_level,
      is_active, last_scanned_at,
      red_team_scans(id, status, findings_created, started_at)
    `)
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  const items = targets ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-vault-teal" /> AI Red Team
          </h1>
          <p className="text-sm text-vault-muted mt-0.5">
            Continuous AI-driven adversarial analysis — findings route into your normal Submissions queue
          </p>
        </div>
        <Link href="/dashboard/ai-red-team/new" className="btn-teal flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Target
        </Link>
      </div>

      <div className="vault-card p-4 border-vault-teal/20 flex gap-3">
        <Zap className="w-4 h-4 text-vault-teal shrink-0 mt-0.5" />
        <p className="text-xs text-vault-muted leading-relaxed">
          AI Red Team performs AI-assisted static analysis (for connected repos) or threat modeling
          (for described scope) — not live network exploitation. Every finding becomes a real submission
          in your <Link href="/dashboard/org/submissions" className="text-vault-teal hover:underline">Submissions queue</Link>,
          attributed to the AI agent, requiring the same human triage as any researcher report.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-6 h-6" />}
          title="No targets yet"
          description="Connect a public GitHub repo or describe a system scope for continuous AI-driven adversarial review."
          action={{ href: "/dashboard/ai-red-team/new", label: "Add a target" }}
        />
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {items.map((target) => {
            const scans = Array.isArray(target.red_team_scans) ? target.red_team_scans : [];
            const totalFindings = scans.reduce((sum, s) => sum + (s.findings_created ?? 0), 0);
            const scanCount = scans.length;

            return (
              <Link
                key={target.id}
                href={`/dashboard/ai-red-team/${target.id}`}
                className="flex items-center gap-4 p-4 hover:bg-vault-elevated/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0">
                  {target.target_type === "github_repo"
                    ? <GitBranch className="w-4 h-4 text-vault-teal" />
                    : <FileText className="w-4 h-4 text-vault-teal" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                    {target.name}
                  </p>
                  <p className="text-xs text-vault-muted mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {target.last_scanned_at ? `Last scanned ${formatRelativeTime(target.last_scanned_at)}` : "Never scanned"}
                    </span>
                    {totalFindings > 0 && (
                      <span className="flex items-center gap-1">
                        <Bug className="w-3 h-3" /> {totalFindings} finding{totalFindings !== 1 ? "s" : ""} across {scanCount} scan{scanCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {!target.is_active && (
                      <span className="text-zinc-500">Paused</span>
                    )}
                  </p>
                </div>
                <AggressionBadge level={target.aggression_level} />
                <ChevronRight className="w-4 h-4 text-vault-muted shrink-0 group-hover:text-vault-teal transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import {
  ChevronLeft, Shield, Calendar, User, Plus,
  Sparkles, FileText, CheckCircle2, Bug,
} from "lucide-react";
import { TestPlanPanel }     from "@/components/ptaas/test-plan-panel";
import { EngagementStatusControl } from "@/components/ptaas/engagement-status-control";
import { FindingStatusControl }    from "@/components/ptaas/finding-status-control";
import { ReportPanel }       from "@/components/ptaas/report-panel";
import { formatDate }        from "@/lib/utils";
import type { Metadata }     from "next";
import type { SeverityLevel } from "@/lib/supabase/types";
import { VaultContextSetter } from "@/components/vault/vault-context-setter";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const supabase = createClient();
  const { data } = await supabase.from("pentest_engagements").select("name").eq("id", params.id).single();
  return { title: data?.name ?? "Engagement" };
}

const SEV_CFG: Record<SeverityLevel, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "text-red-400 bg-red-950/50 border-red-900/50"          },
  high:     { label: "High",     cls: "text-orange-400 bg-orange-950/50 border-orange-900/50"  },
  medium:   { label: "Medium",   cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50"  },
  low:      { label: "Low",      cls: "text-blue-400 bg-blue-950/50 border-blue-900/50"        },
  info:     { label: "Info",     cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"        },
};

export default async function EngagementDetailPage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();

  const { data: engagement } = await supabase
    .from("pentest_engagements")
    .select(`
      *,
      organizations(name, owner_id),
      profiles!pentest_engagements_assigned_pentester_id_fkey(id, full_name, username)
    `)
    .eq("id", params.id)
    .single();

  if (!engagement) notFound();

  const org = Array.isArray(engagement.organizations) ? engagement.organizations[0] : engagement.organizations;
  const pentester = Array.isArray(engagement.profiles) ? engagement.profiles[0] : engagement.profiles;

  const isOrgOwner = org?.owner_id === user.id;
  const isPentester = pentester?.id === user.id;
  if (!isOrgOwner && !isPentester) notFound();

  const { data: findings } = await supabase
    .from("pentest_findings")
    .select("*")
    .eq("engagement_id", params.id)
    .order("created_at", { ascending: false });

  const { data: reports } = await supabase
    .from("pentest_reports")
    .select("*")
    .eq("engagement_id", params.id)
    .order("generated_at", { ascending: false })
    .limit(1);

  const latestReport = reports?.[0] ?? null;
  const items = findings ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in">
      <VaultContextSetter page="ptaas_engagement_detail" engagementId={engagement.id} />
      <div className="flex items-start gap-3">
        <Link href="/dashboard/ptaas" className="text-vault-muted hover:text-vault-text transition-colors mt-1">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-vault-teal" /> {engagement.name}
          </h1>
          <p className="text-sm text-vault-muted mt-1 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {formatDate(engagement.start_date)} – {formatDate(engagement.end_date)}
            </span>
            {pentester && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> {pentester.full_name ?? pentester.username}
              </span>
            )}
          </p>
        </div>
        {isOrgOwner && (
          <EngagementStatusControl engagementId={engagement.id} currentStatus={engagement.status} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">

          {/* Scope */}
          <div className="vault-card p-5">
            <h2 className="text-[11px] font-medium text-vault-muted uppercase tracking-wide mb-2">Scope</h2>
            <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">{engagement.scope_description}</p>
            {engagement.objectives && (
              <>
                <h2 className="text-[11px] font-medium text-vault-muted uppercase tracking-wide mb-2 mt-4">Objectives</h2>
                <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">{engagement.objectives}</p>
              </>
            )}
          </div>

          {/* Test plan */}
          <TestPlanPanel engagementId={engagement.id} testPlan={engagement.test_plan} canGenerate={isOrgOwner || isPentester} />

          {/* Findings */}
          <div className="vault-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <Bug className="w-4 h-4 text-vault-teal" /> Findings ({items.length})
              </h2>
              {isPentester && (
                <Link
                  href={`/dashboard/ptaas/${engagement.id}/findings/new`}
                  className="btn-ghost text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Finding
                </Link>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-vault-muted text-center py-8">
                No findings logged yet
              </p>
            ) : (
              <div className="divide-y divide-vault-border">
                {items.map((f) => {
                  const sevCfg = SEV_CFG[f.severity as SeverityLevel] ?? SEV_CFG.info;
                  return (
                    <div key={f.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${sevCfg.cls}`}>
                            {sevCfg.label}
                          </span>
                          <p className="text-sm font-medium">{f.title}</p>
                        </div>
                        {(isOrgOwner || isPentester) && (
                          <FindingStatusControl
                            findingId={f.id}
                            engagementId={engagement.id}
                            currentStatus={f.status}
                          />
                        )}
                      </div>
                      <p className="text-xs text-vault-muted leading-relaxed">{f.description}</p>
                      {f.retest_notes && (
                        <p className="text-xs text-vault-teal mt-2 italic">Retest note: {f.retest_notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ReportPanel
            engagementId={engagement.id}
            report={latestReport}
            canGenerate={isOrgOwner}
            hasFindings={items.length > 0}
          />
        </div>
      </div>
    </div>
  );
}

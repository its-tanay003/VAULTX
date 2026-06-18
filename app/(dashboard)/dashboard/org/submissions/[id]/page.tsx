import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import {
  ChevronLeft, Zap, Shield, CheckCircle2,
  XCircle, AlertTriangle, Clock, Copy,
  User, Paperclip, Bug, RotateCcw,
} from "lucide-react";
import { TriageActions }     from "@/components/submissions/triage-actions";
import { AIConfidenceBar }   from "@/components/submissions/ai-confidence-bar";
import { RealtimeSubmissionStatus } from "@/components/realtime/realtime-submission-status";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { Metadata }                  from "next";
import type { SubmissionStatus, SeverityLevel } from "@/lib/supabase/types";

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase.from("submissions").select("title").eq("id", params.id).single();
  return { title: data?.title ?? "Submission" };
}

const SEV_CFG: Record<SeverityLevel, { label: string; cls: string; dot: string }> = {
  critical: { label: "Critical", cls: "text-red-400 bg-red-950/50 border-red-900/50",         dot: "bg-red-400"    },
  high:     { label: "High",     cls: "text-orange-400 bg-orange-950/50 border-orange-900/50", dot: "bg-orange-400" },
  medium:   { label: "Medium",   cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50", dot: "bg-yellow-400" },
  low:      { label: "Low",      cls: "text-blue-400 bg-blue-950/50 border-blue-900/50",       dot: "bg-blue-400"   },
  info:     { label: "Info",     cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50",       dot: "bg-zinc-400"   },
};

const STATUS_CFG: Record<SubmissionStatus, { label: string; color: string; bg: string }> = {
  new:        { label: "New",       color: "text-sky-400",     bg: "bg-sky-950/50 border-sky-900/50"            },
  triaging:   { label: "Triaging",  color: "text-violet-400",  bg: "bg-violet-950/50 border-violet-900/50"      },
  needs_info: { label: "Info Req",  color: "text-yellow-400",  bg: "bg-yellow-950/50 border-yellow-900/50"      },
  accepted:   { label: "Accepted",  color: "text-emerald-400", bg: "bg-emerald-950/50 border-emerald-900/50"    },
  rejected:   { label: "Rejected",  color: "text-red-400",     bg: "bg-red-950/50 border-red-900/50"            },
  duplicate:  { label: "Duplicate", color: "text-zinc-400",    bg: "bg-zinc-800/50 border-zinc-700/50"          },
  wont_fix:   { label: "Won't Fix", color: "text-zinc-500",    bg: "bg-zinc-900/50 border-zinc-800/50"          },
  resolved:   { label: "Resolved",  color: "text-teal-400",    bg: "bg-teal-950/50 border-teal-900/50"          },
};

export default async function OrgSubmissionDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();

  const { data: sub } = await supabase
    .from("submissions")
    .select(`
      *,
      programs!inner(id, name, type, org_id),
      profiles!submissions_researcher_id_fkey(id, full_name, username, avatar_url, reputation)
    `)
    .eq("id", params.id)
    .single();

  if (!sub) notFound();

  const program    = Array.isArray(sub.programs) ? sub.programs[0] : sub.programs;
  const researcher = Array.isArray(sub.profiles)  ? sub.profiles[0]  : sub.profiles;

  // Access check
  const isOrgViewer = profile?.org_id === program?.org_id ||
    ["triager","admin"].includes(profile?.role ?? "");
  if (!isOrgViewer) notFound();

  // Load duplicate original if flagged
  let duplicateOriginal: { id: string; title: string } | null = null;
  if (sub.ai_duplicate_of) {
    const { data } = await supabase
      .from("submissions")
      .select("id, title")
      .eq("id", sub.ai_duplicate_of)
      .single();
    duplicateOriginal = data;
  }

  const status  = STATUS_CFG[sub.status as SubmissionStatus] ?? STATUS_CFG.new;
  const sev     = SEV_CFG[sub.severity   as SeverityLevel]   ?? SEV_CFG.info;
  const aiSev   = sub.ai_severity ? SEV_CFG[sub.ai_severity as SeverityLevel] : null;

  const severityMismatch = aiSev && sub.ai_severity !== sub.severity;

  const canTriage = ["triager","admin"].includes(profile?.role ?? "") ||
    profile?.org_id === program?.org_id;

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/org/submissions" className="text-vault-muted hover:text-vault-text mt-1">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <RealtimeSubmissionStatus
              submissionId={sub.id}
              initialStatus={sub.status as SubmissionStatus}
              initialAiDone={!!sub.ai_severity}
            />
            <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${sev.cls}`}>
              {sev.label}
            </span>
            {severityMismatch && (
              <span className="text-xs text-orange-400 bg-orange-950/40 border border-orange-900/40 px-2 py-0.5 rounded flex items-center gap-1">
                <Zap className="w-3 h-3" /> AI rates {aiSev?.label}
              </span>
            )}
            {sub.ai_duplicate_of && (
              <span className="text-xs text-yellow-400 bg-yellow-950/40 border border-yellow-900/40 px-2 py-0.5 rounded flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Possible duplicate
              </span>
            )}
          </div>
          <h1 className="text-lg font-semibold leading-snug">{sub.title}</h1>
          <p className="text-sm text-vault-muted mt-1 flex items-center gap-2 flex-wrap">
            <Link href={`/dashboard/org/programs/${program?.id}`} className="text-vault-teal hover:underline">
              {program?.name}
            </Link>
            <span>·</span>
            <span>{formatRelativeTime(sub.created_at)}</span>
            <span>·</span>
            <span className="font-mono text-[11px]">{sub.id.slice(0, 8)}…</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main report */}
        <div className="lg:col-span-2 space-y-4">

          {/* Duplicate warning */}
          {duplicateOriginal && (
            <div className="vault-card p-4 border-yellow-900/50">
              <div className="flex gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-400 mb-1">
                    AI flagged as possible duplicate
                  </p>
                  <p className="text-xs text-vault-muted mb-2">
                    Similar to:{" "}
                    <Link
                      href={`/dashboard/org/submissions/${duplicateOriginal.id}`}
                      className="text-yellow-400 hover:underline"
                    >
                      {duplicateOriginal.title}
                    </Link>
                  </p>
                  <p className="text-xs text-vault-muted">
                    Review both submissions before deciding. The triager always makes the final call.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Section title="Description">
            <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">{sub.description}</p>
          </Section>

          {sub.steps_to_reproduce && (
            <Section title="Steps to Reproduce">
              <pre className="text-xs font-mono text-vault-subtle leading-relaxed whitespace-pre-wrap bg-vault-bg rounded-lg p-3 border border-vault-border overflow-x-auto">
                {sub.steps_to_reproduce}
              </pre>
            </Section>
          )}

          {sub.impact && (
            <Section title="Impact & Business Risk">
              <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">{sub.impact}</p>
            </Section>
          )}

          {sub.attachments?.length > 0 && (
            <Section title={`Attachments (${sub.attachments.length})`}>
              <div className="space-y-2">
                {sub.attachments.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2.5 bg-vault-elevated border border-vault-border rounded-lg hover:border-vault-teal/40 transition-colors text-sm"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-vault-teal" />
                    <span className="flex-1 truncate text-vault-subtle">{url.split("/").pop()}</span>
                    <span className="text-xs text-vault-teal">Open →</span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Triager actions */}
          {canTriage && (
            <Section title="Triager Actions">
              <TriageActions
                submissionId={sub.id}
                currentStatus={sub.status as SubmissionStatus}
              />
            </Section>
          )}

          {/* Existing triager note */}
          {sub.triager_note && (
            <div className="vault-card p-4 border-vault-teal/20">
              <p className="text-xs font-medium text-vault-teal mb-2">Triager Note</p>
              <p className="text-sm text-vault-muted leading-relaxed">{sub.triager_note}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* AI Panel */}
          <div className="vault-card p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-vault-teal" />
              AI Analysis
            </h3>

            {sub.ai_severity ? (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-vault-muted">Researcher</span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded border capitalize ${sev.cls}`}>
                    {sev.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-vault-muted">AI Assessment</span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded border capitalize ${aiSev?.cls}`}>
                    {aiSev?.label}
                  </span>
                </div>

                {sub.ai_confidence !== null && (
                  <AIConfidenceBar confidence={sub.ai_confidence} />
                )}

                {sub.ai_analysis && (
                  <div className="pt-3 border-t border-vault-border">
                    <p className="text-xs font-medium text-vault-muted mb-1.5">Analysis</p>
                    <p className="text-xs text-vault-muted leading-relaxed">{sub.ai_analysis}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-vault-border">
                  <p className="text-[10px] text-vault-muted">
                    ⚠ AI suggests — human triager decides. AI cannot approve rewards.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="w-5 h-5 text-vault-muted mx-auto mb-2 opacity-60" />
                <p className="text-xs text-vault-muted">Analysis pending…</p>
                <p className="text-[11px] text-vault-muted mt-1">Usually within 30 seconds</p>
              </div>
            )}
          </div>

          {/* Researcher card */}
          <div className="vault-card p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-vault-teal" />
              Researcher
            </h3>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-vault-teal/20 border border-vault-teal/30 flex items-center justify-center text-vault-teal text-xs font-medium shrink-0">
                {researcher?.full_name?.[0] ?? "?"}
              </div>
              <div>
                <p className="text-sm font-medium">{researcher?.full_name ?? "Anonymous"}</p>
                <p className="text-xs text-vault-muted">
                  {researcher?.username ? `@${researcher.username}` : ""}
                  {researcher?.reputation ? ` · ${researcher.reputation} pts` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="vault-card p-4 space-y-2">
            <InfoRow label="Submitted"  value={formatDate(sub.created_at)} />
            <InfoRow label="Updated"    value={formatRelativeTime(sub.updated_at)} />
            <InfoRow label="Program"    value={program?.name ?? "—"} />
            <InfoRow label="Type"       value={(program?.type ?? "—").replace("_"," ")} />
            <div className="pt-2 border-t border-vault-border">
              <p className="text-xs text-vault-muted mb-1.5">Report ID</p>
              <div className="flex items-center gap-2 bg-vault-bg border border-vault-border rounded px-2 py-1.5">
                <code className="text-[11px] font-mono text-vault-muted flex-1 truncate">{sub.id}</code>
                <Copy className="w-3 h-3 text-vault-muted hover:text-vault-teal cursor-pointer transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="vault-card p-5">
      <h2 className="text-[11px] font-medium text-vault-muted uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b border-vault-border/50 pb-2 last:border-0 last:pb-0">
      <span className="text-vault-muted">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

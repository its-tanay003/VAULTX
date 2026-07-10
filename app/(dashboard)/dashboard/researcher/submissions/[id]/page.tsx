import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import {
  ChevronLeft, Clock, CheckCircle2, XCircle,
  AlertTriangle, Zap, Paperclip, Copy, Shield,
  Bug, User,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { Metadata }            from "next";
import type { SubmissionStatus, SeverityLevel } from "@/lib/supabase/types";
import { RealtimeSubmissionStatus } from "@/components/realtime/realtime-submission-status";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const supabase = createClient();
  const { data } = await supabase.from("submissions").select("title").eq("id", params.id).single();
  return { title: data?.title ?? "Report" };
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  new:        { label: "New",       color: "text-sky-400",     bg: "bg-sky-950/50 border-sky-900/50",         icon: <Clock className="w-4 h-4 text-sky-400" />        },
  triaging:   { label: "Triaging",  color: "text-violet-400",  bg: "bg-violet-950/50 border-violet-900/50",   icon: <Shield className="w-4 h-4 text-violet-400" />    },
  needs_info: { label: "Info Req",  color: "text-yellow-400",  bg: "bg-yellow-950/50 border-yellow-900/50",   icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />},
  accepted:   { label: "Accepted",  color: "text-emerald-400", bg: "bg-emerald-950/50 border-emerald-900/50", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />},
  rejected:   { label: "Rejected",  color: "text-red-400",     bg: "bg-red-950/50 border-red-900/50",         icon: <XCircle className="w-4 h-4 text-red-400" />      },
  duplicate:  { label: "Duplicate", color: "text-zinc-400",    bg: "bg-zinc-800/50 border-zinc-700/50",       icon: <XCircle className="w-4 h-4 text-zinc-400" />     },
  wont_fix:   { label: "Won't Fix", color: "text-zinc-500",    bg: "bg-zinc-900/50 border-zinc-800/50",       icon: <XCircle className="w-4 h-4 text-zinc-500" />     },
  resolved:   { label: "Resolved",  color: "text-teal-400",    bg: "bg-teal-950/50 border-teal-900/50",       icon: <CheckCircle2 className="w-4 h-4 text-teal-400" />},
};

const SEV_CONFIG: Record<SeverityLevel, { label: string; cls: string; dot: string }> = {
  critical: { label: "Critical", cls: "text-red-400 bg-red-950/50 border-red-900/50",         dot: "bg-red-400"    },
  high:     { label: "High",     cls: "text-orange-400 bg-orange-950/50 border-orange-900/50", dot: "bg-orange-400" },
  medium:   { label: "Medium",   cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50", dot: "bg-yellow-400" },
  low:      { label: "Low",      cls: "text-blue-400 bg-blue-950/50 border-blue-900/50",       dot: "bg-blue-400"   },
  info:     { label: "Info",     cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50",       dot: "bg-zinc-400"   },
};

export default async function SubmissionDetailPage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("submissions")
    .select(`
      *,
      programs(id, name, type, org_id),
      profiles!submissions_researcher_id_fkey(full_name, username, avatar_url)
    `)
    .eq("id", params.id)
    .single();

  if (!sub) notFound();

  // Access control: researcher sees own, org sees their programs
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single();

  const isResearcher  = sub.researcher_id === user.id;
  const program       = Array.isArray(sub.programs) ? sub.programs[0] : sub.programs;
  const isOrgViewer   = profile?.org_id === program?.org_id || profile?.role === "triager" || profile?.role === "admin";

  if (!isResearcher && !isOrgViewer) notFound();

  const status  = STATUS_CONFIG[sub.status as SubmissionStatus] ?? STATUS_CONFIG.new;
  const sev     = SEV_CONFIG[sub.severity as SeverityLevel]     ?? SEV_CONFIG.info;
  const aiSev   = sub.ai_severity ? SEV_CONFIG[sub.ai_severity as SeverityLevel] : null;

  // Timeline events (synthesized from status)
  const timeline = buildTimeline(sub);

  const backHref = isResearcher
    ? "/dashboard/researcher/submissions"
    : `/dashboard/org/submissions`;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={backHref} className="text-vault-muted hover:text-vault-text transition-colors mt-1">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <RealtimeSubmissionStatus
              submissionId={sub.id}
              initialStatus={sub.status as SubmissionStatus}
              initialAiDone={!!sub.ai_severity}
            />
            <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${sev.cls}`}>
              {sev.label}
            </span>
            {sub.ai_duplicate_of && (
              <span className="text-xs text-yellow-400 bg-yellow-950/50 border border-yellow-900/50 px-2 py-0.5 rounded flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Flagged: Possible Duplicate
              </span>
            )}
          </div>
          <h1 className="text-lg font-semibold leading-snug">{sub.title}</h1>
          <p className="text-sm text-vault-muted mt-1 flex items-center gap-2 flex-wrap">
            <span>Submitted {formatRelativeTime(sub.created_at)}</span>
            <span>·</span>
            <Link
              href={isResearcher
                ? `/dashboard/researcher/programs/${program?.id}`
                : `/dashboard/org/programs/${program?.id}`}
              className="text-vault-teal hover:underline"
            >
              {program?.name}
            </Link>
            <span>·</span>
            <span className="font-mono text-[11px] text-vault-muted">{sub.id.slice(0, 8)}…</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">

          {/* Description */}
          <ReportSection title="Description">
            <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">{sub.description}</p>
          </ReportSection>

          {/* Steps */}
          {sub.steps_to_reproduce && (
            <ReportSection title="Steps to Reproduce">
              <pre className="text-xs font-mono text-vault-subtle leading-relaxed whitespace-pre-wrap bg-vault-bg rounded-lg p-3 border border-vault-border overflow-x-auto">
                {sub.steps_to_reproduce}
              </pre>
            </ReportSection>
          )}

          {/* Impact */}
          {sub.impact && (
            <ReportSection title="Impact & Business Risk">
              <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">{sub.impact}</p>
            </ReportSection>
          )}

          {/* Attachments */}
          {sub.attachments && sub.attachments.length > 0 && (
            <ReportSection title={`Attachments (${sub.attachments.length})`}>
              <div className="space-y-2">
                {await (async () => {
                  const { getAttachmentDownloadUrl } = await import("@/app/actions/submissions");
                  const links = await Promise.all(
                    sub.attachments.map(async (path: string) => {
                      try {
                        // If it's a legacy public URL, return it directly, otherwise fetch signed url
                        if (path.startsWith("http://") || path.startsWith("https://")) {
                          return { name: path.split("/").pop() ?? "attachment", url: path };
                        }
                        const url = await getAttachmentDownloadUrl(path);
                        return { name: path.split("/").pop() ?? "attachment", url };
                      } catch (err) {
                        return { name: path.split("/").pop() ?? "attachment", url: "#", error: true };
                      }
                    })
                  );
                  return links.map((item, i) => (
                    <a
                      key={i}
                      href={item.url}
                      target={item.error ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2.5 bg-vault-elevated border border-vault-border rounded-lg hover:border-vault-teal/40 transition-colors text-sm"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-vault-teal shrink-0" />
                      <span className="flex-1 truncate text-vault-subtle">{item.name}</span>
                      <span className="text-xs text-vault-teal">{item.error ? "Unavailable" : "View →"}</span>
                    </a>
                  ));
                })()}
              </div>
            </ReportSection>
          )}

          {/* Triager note */}
          {sub.triager_note && (
            <ReportSection title="Triager Note">
              <div className="flex gap-3 bg-vault-elevated rounded-lg p-3.5 border border-vault-border">
                <User className="w-4 h-4 text-vault-muted shrink-0 mt-0.5" />
                <p className="text-sm text-vault-muted leading-relaxed">{sub.triager_note}</p>
              </div>
            </ReportSection>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* AI Analysis */}
          <div className="vault-card p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-vault-teal" /> AI Analysis
            </h3>

            {sub.ai_severity ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-vault-muted">AI Severity</span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded border capitalize ${aiSev?.cls}`}>
                    {aiSev?.label}
                  </span>
                </div>
                {sub.ai_confidence && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-vault-muted">Confidence</span>
                      <span className="text-sm font-medium">{Math.round(sub.ai_confidence * 100)}%</span>
                    </div>
                    <div className="bg-vault-elevated rounded-full h-1.5">
                      <div
                        className="bg-vault-teal h-1.5 rounded-full"
                        style={{ width: `${sub.ai_confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {sub.ai_analysis && (
                  <p className="text-xs text-vault-muted leading-relaxed border-t border-vault-border pt-3">
                    {sub.ai_analysis}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="w-5 h-5 text-vault-muted mx-auto mb-2 opacity-60" />
                <p className="text-xs text-vault-muted">AI analysis pending</p>
                <p className="text-[11px] text-vault-muted mt-1">Usually completes within 30 seconds</p>
              </div>
            )}
          </div>

          {/* Submission info */}
          <div className="vault-card p-4 space-y-2.5">
            <h3 className="text-sm font-medium mb-1">Details</h3>
            <InfoRow label="Submitted"  value={formatDate(sub.created_at)} />
            <InfoRow label="Updated"    value={formatRelativeTime(sub.updated_at)} />
            <InfoRow label="Severity"   value={sev.label} />
            <InfoRow label="Program"    value={program?.name ?? "—"} />
            {sub.triager_id && <InfoRow label="Triager" value="Assigned" />}
          </div>

          {/* Submission ID */}
          <div className="vault-card p-4">
            <p className="text-xs font-medium text-vault-muted mb-2">Report ID</p>
            <div className="flex items-center gap-2 bg-vault-bg border border-vault-border rounded-lg px-2.5 py-2">
              <code className="text-[11px] font-mono text-vault-muted flex-1 truncate">{sub.id}</code>
              <button className="text-vault-muted hover:text-vault-teal transition-colors">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="vault-card p-4">
            <h3 className="text-sm font-medium mb-3">Timeline</h3>
            <div className="space-y-3">
              {timeline.map((event, i) => (
                <div key={i} className="flex gap-3 text-xs">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-0.5 ${event.dot}`} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-vault-border" />}
                  </div>
                  <div className="pb-2">
                    <p className="font-medium text-vault-subtle">{event.label}</p>
                    <p className="text-vault-muted">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="vault-card p-5">
      <h2 className="text-sm font-medium mb-3 text-vault-subtle uppercase tracking-wide text-[11px]">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b border-vault-border/50 pb-2 last:border-0 last:pb-0">
      <span className="text-vault-muted">{label}</span>
      <span className="font-medium text-right max-w-[55%] truncate">{value}</span>
    </div>
  );
}

function buildTimeline(sub: Record<string, unknown>) {
  const events = [];
  const STATUS_DOTS: Record<string, string> = {
    new: "bg-sky-400", triaging: "bg-violet-400", accepted: "bg-emerald-400",
    rejected: "bg-red-400", duplicate: "bg-zinc-500", needs_info: "bg-yellow-400",
    resolved: "bg-teal-400", wont_fix: "bg-zinc-600",
  };

  events.push({
    label: "Submitted",
    time:  formatRelativeTime(sub.created_at as string),
    dot:   "bg-sky-400",
  });

  if (sub.ai_severity) {
    events.push({ label: "AI analysis complete", time: "Auto", dot: "bg-vault-teal" });
  }

  const status = sub.status as string;
  if (status !== "new") {
    events.push({
      label: STATUS_CONFIG[status as SubmissionStatus]?.label ?? status,
      time:  formatRelativeTime(sub.updated_at as string),
      dot:   STATUS_DOTS[status] ?? "bg-zinc-500",
    });
  }

  return events;
}

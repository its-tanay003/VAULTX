import { createClient }          from "@/lib/supabase/server";
import { redirect, notFound }    from "next/navigation";
import Link                      from "next/link";
import {
  ChevronLeft, Bug, Globe, Lock, Edit, Pause, Play,
  Archive, Clock, Trophy, CheckCircle2, XCircle,
  Shield, AlertTriangle,
} from "lucide-react";
import { StatCard }              from "@/components/ui/stat-card";
import { ProgramStatusControl }  from "@/components/programs/program-status-control";
import { CopyButton }            from "@/components/ui/copy-button";
import {
  formatCurrency, formatDate, formatRelativeTime, truncate,
} from "@/lib/utils";
import type { Metadata }         from "next";

import { VaultContextSetter } from "@/components/vault/vault-context-setter";

interface Props { params: Promise<{ id: string }> }


export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const supabase = createClient();
  const { data } = await supabase.from("programs").select("name").eq("id", params.id).single();
  return { title: data?.name ?? "Program" };
}

export default async function ProgramDetailPage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load program + org ownership check
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  const [{ data: program }, { data: submissions }] = await Promise.all([
    supabase.from("programs").select("*").eq("id", params.id).single(),
    supabase.from("submissions")
      .select("id, title, severity, status, created_at, researcher_id")
      .eq("program_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!program) notFound();

  // Ensure this org owns this program
  const canManage =
    profile?.org_id === program.org_id ||
    profile?.role === "admin";

  // Submission stats
  const subs = submissions ?? [];
  const byStatus = subs.reduce((a, s) => {
    a[s.status] = (a[s.status] ?? 0) + 1; return a;
  }, {} as Record<string, number>);

  const acceptanceRate = subs.length > 0
    ? Math.round(((byStatus.accepted ?? 0) / subs.length) * 100)
    : 0;

  const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
    active:   { dot: "bg-emerald-400", badge: "text-emerald-400 bg-emerald-950/60 border-emerald-900/50" },
    draft:    { dot: "bg-zinc-500",    badge: "text-zinc-400 bg-zinc-800/60 border-zinc-700/50" },
    paused:   { dot: "bg-yellow-400",  badge: "text-yellow-400 bg-yellow-950/60 border-yellow-900/50" },
    archived: { dot: "bg-zinc-600",    badge: "text-zinc-500 bg-zinc-900/60 border-zinc-800/50" },
  };

  const st = STATUS_STYLES[program.status] ?? STATUS_STYLES.draft;

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in">
      <VaultContextSetter page="org_program_detail" programId={program.id} />
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/org/programs"
            className="text-vault-muted hover:text-vault-text transition-colors mt-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-xl font-semibold">{program.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${st.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                {program.status}
              </span>
              <span className="text-xs text-vault-muted border border-vault-border rounded px-1.5 py-0.5 capitalize">
                {program.type.replace("_", " ")}
              </span>
              {program.is_public
                ? <span title="Public"><Globe className="w-3.5 h-3.5 text-vault-muted" /></span>
                : <span title="Private"><Lock  className="w-3.5 h-3.5 text-vault-muted" /></span>}
            </div>
            <p className="text-sm text-vault-muted">
              Created {formatDate(program.created_at)} ·{" "}
              <span className="font-mono text-xs">{program.slug}</span>
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/dashboard/org/programs/${program.id}/edit`}
              className="btn-ghost flex items-center gap-1.5 text-sm"
            >
              <Edit className="w-3.5 h-3.5" /> Edit
            </Link>
            <ProgramStatusControl
              programId={program.id}
              currentStatus={program.status as "active" | "draft" | "paused" | "archived"}
            />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Submissions"
          value={program.total_submissions}
          icon={<Bug className="w-4 h-4" />}
          accent="teal"
        />
        <StatCard
          label="Acceptance Rate"
          value={subs.length > 0 ? `${acceptanceRate}%` : "—"}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="green"
        />
        <StatCard
          label="Total Paid"
          value={formatCurrency(program.total_paid)}
          icon={<Trophy className="w-4 h-4" />}
          accent="amber"
        />
        <StatCard
          label="Response SLA"
          value={`${program.avg_response_hours}h`}
          icon={<Clock className="w-4 h-4" />}
          accent="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Description + scope */}
        <div className="lg:col-span-2 space-y-4">

          {/* Description */}
          <div className="vault-card p-5">
            <h2 className="text-sm font-medium mb-3">Description</h2>
            <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">
              {program.description || <span className="italic">No description provided.</span>}
            </p>
          </div>

          {/* Scope */}
          <div className="vault-card p-5">
            <h2 className="text-sm font-medium mb-4">Scope</h2>
            <div className="space-y-4">
              <ScopeSection
                label="In scope"
                items={program.scope_in}
                dotColor="bg-emerald-400"
                emptyMsg="No in-scope assets defined"
              />
              {program.scope_out.length > 0 && (
                <ScopeSection
                  label="Out of scope"
                  items={program.scope_out}
                  dotColor="bg-red-400"
                  emptyMsg="No exclusions defined"
                />
              )}
            </div>
          </div>

          {/* Rules */}
          {program.rules && (
            <div className="vault-card p-5">
              <h2 className="text-sm font-medium mb-3">Rules & Safe Harbor</h2>
              <p className="text-sm text-vault-muted leading-relaxed whitespace-pre-wrap">
                {program.rules}
              </p>
            </div>
          )}

          {/* Recent submissions */}
          <div className="vault-card">
            <div className="flex items-center justify-between p-4 border-b border-vault-border">
              <h2 className="text-sm font-medium">
                Recent Submissions
                {subs.length > 0 && (
                  <span className="ml-2 text-xs text-vault-muted">({subs.length})</span>
                )}
              </h2>
              <Link
                href={`/dashboard/org/submissions?program=${program.id}`}
                className="text-xs text-vault-teal hover:text-vault-teal/80 transition-colors"
              >
                View all →
              </Link>
            </div>

            {subs.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Shield className="w-6 h-6 text-vault-muted mb-3 opacity-60" />
                <p className="text-sm text-vault-muted">No submissions yet</p>
                {program.status === "draft" && (
                  <p className="text-xs text-vault-muted mt-1 max-w-xs">
                    Activate this program so researchers can start submitting
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-vault-border">
                {subs.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/dashboard/org/submissions/${sub.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-vault-elevated/50 transition-colors group"
                  >
                    <SubmissionStatusIcon status={sub.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                        {truncate(sub.title, 55)}
                      </div>
                      <div className="text-xs text-vault-muted mt-0.5">
                        {formatRelativeTime(sub.created_at)}
                      </div>
                    </div>
                    <SeverityBadge severity={sub.severity} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">

          {/* Reward info */}
          <div className="vault-card p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-vault-teal" /> Rewards
            </h3>
            {program.type === "vdp" ? (
              <p className="text-sm text-vault-muted">
                Vulnerability Disclosure Program — no monetary rewards
              </p>
            ) : program.min_reward || program.max_reward ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-vault-muted">Range</span>
                  <span className="font-medium">
                    {formatCurrency(program.min_reward ?? 0)} – {formatCurrency(program.max_reward ?? 0)}
                  </span>
                </div>
                <p className="text-xs text-vault-muted">
                  Actual rewards require human approval per submission
                </p>
              </div>
            ) : (
              <p className="text-sm text-vault-muted">Reward range not set</p>
            )}
          </div>

          {/* Submission breakdown */}
          {subs.length > 0 && (
            <div className="vault-card p-4">
              <h3 className="text-sm font-medium mb-3">Submission Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(byStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between text-sm">
                    <span className="text-vault-muted capitalize">{status}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Program ID / share */}
          <div className="vault-card p-4">
            <h3 className="text-sm font-medium mb-3">Program ID</h3>
            <div className="flex items-center gap-2 bg-vault-bg border border-vault-border rounded-lg px-2.5 py-2">
              <code className="text-[11px] font-mono text-vault-muted flex-1 truncate">
                {program.id}
              </code>
              <CopyButton text={program.id} />
            </div>
          </div>

          {/* Draft warning */}
          {program.status === "draft" && canManage && (
            <div className="vault-card p-4 border-yellow-900/50">
              <div className="flex gap-2.5">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">Draft</p>
                  <p className="text-xs text-vault-muted mt-1">
                    This program is not visible to researchers. Activate it when you&apos;re ready.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function ScopeSection({
  label, items, dotColor, emptyMsg,
}: {
  label: string; items: string[]; dotColor: string; emptyMsg: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-vault-muted uppercase tracking-wider mb-2">{label}</p>
      {items.length === 0 ? (
        <p className="text-sm text-vault-muted italic">{emptyMsg}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
              <span className="font-mono text-xs text-vault-subtle">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SubmissionStatusIcon({ status }: { status: string }) {
  const map: Record<string, React.ReactNode> = {
    new:        <Clock        className="w-4 h-4 text-sky-400"     />,
    triaging:   <Clock        className="w-4 h-4 text-violet-400"  />,
    accepted:   <CheckCircle2 className="w-4 h-4 text-green-400"   />,
    rejected:   <XCircle      className="w-4 h-4 text-red-400"     />,
    duplicate:  <XCircle      className="w-4 h-4 text-zinc-500"    />,
    needs_info: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
    resolved:   <CheckCircle2 className="w-4 h-4 text-teal-400"    />,
  };
  return <>{map[status] ?? <Clock className="w-4 h-4 text-vault-muted" />}</>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "text-red-400 bg-red-950/50 border-red-900/50",
    high:     "text-orange-400 bg-orange-950/50 border-orange-900/50",
    medium:   "text-yellow-400 bg-yellow-950/50 border-yellow-900/50",
    low:      "text-blue-400 bg-blue-950/50 border-blue-900/50",
    info:     "text-zinc-400 bg-zinc-800/50 border-zinc-700/50",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize shrink-0 ${map[severity] ?? map.info}`}>
      {severity}
    </span>
  );
}

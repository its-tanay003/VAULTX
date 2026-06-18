import { createClient }    from "@/lib/supabase/server";
import { redirect }         from "next/navigation";
import Link                 from "next/link";
import {
  Bug, Search, ChevronRight, Zap, AlertTriangle,
  Clock, CheckCircle2, XCircle, Filter,
} from "lucide-react";
import { formatRelativeTime, truncate } from "@/lib/utils";
import type { Metadata }              from "next";
import { TriageFilters } from "@/components/submissions/triage-filters";
import type { SubmissionStatus, SeverityLevel } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Submissions" };

interface Props {
  searchParams: {
    status?:   string;
    severity?: string;
    program?:  string;
    q?:        string;
  };
}

const STATUS_CFG: Record<SubmissionStatus, { label: string; dot: string; badge: string }> = {
  new:        { label: "New",       dot: "bg-sky-400",     badge: "text-sky-400 bg-sky-950/50 border-sky-900/50"            },
  triaging:   { label: "Triaging",  dot: "bg-violet-400",  badge: "text-violet-400 bg-violet-950/50 border-violet-900/50"   },
  needs_info: { label: "Info Req",  dot: "bg-yellow-400",  badge: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50"   },
  accepted:   { label: "Accepted",  dot: "bg-emerald-400", badge: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50"},
  rejected:   { label: "Rejected",  dot: "bg-red-400",     badge: "text-red-400 bg-red-950/50 border-red-900/50"            },
  duplicate:  { label: "Duplicate", dot: "bg-zinc-500",    badge: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"         },
  wont_fix:   { label: "Won't Fix", dot: "bg-zinc-600",    badge: "text-zinc-500 bg-zinc-900/50 border-zinc-800/50"         },
  resolved:   { label: "Resolved",  dot: "bg-teal-400",    badge: "text-teal-400 bg-teal-950/50 border-teal-900/50"         },
};

const SEV_DOTS: Record<SeverityLevel, string> = {
  critical: "bg-red-400",
  high:     "bg-orange-400",
  medium:   "bg-yellow-400",
  low:      "bg-blue-400",
  info:     "bg-zinc-500",
};

const TRIAGE_TABS = [
  { label: "Needs review", statuses: ["new", "triaging", "needs_info"] },
  { label: "Resolved",     statuses: ["accepted", "rejected", "duplicate", "wont_fix", "resolved"] },
  { label: "All",          statuses: [] },
];

export default async function OrgSubmissionsPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/dashboard/org");

  const { data: programs } = await supabase
    .from("programs")
    .select("id, name")
    .eq("org_id", profile.org_id)
    .order("name");

  const filterStatus   = searchParams.status;
  const filterSeverity = searchParams.severity;
  const filterProgram  = searchParams.program;
  const q              = searchParams.q ?? "";
  const view           = filterStatus === "resolved" ? 1 : filterStatus === "all" ? 2 : 0;

  let dbQuery = supabase
    .from("submissions")
    .select(`
      id, title, severity, status, created_at, updated_at,
      ai_severity, ai_confidence, ai_duplicate_of,
      programs!inner(id, name, org_id),
      profiles!submissions_researcher_id_fkey(full_name, username)
    `)
    .eq("programs.org_id", profile.org_id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Tab filter
  const tabStatuses = TRIAGE_TABS[view]?.statuses ?? [];
  if (tabStatuses.length > 0) {
    dbQuery = dbQuery.in("status", tabStatuses as SubmissionStatus[]);
  }
  if (filterSeverity) dbQuery = dbQuery.eq("severity", filterSeverity as SeverityLevel);
  if (filterProgram)  dbQuery = dbQuery.eq("programs.id", filterProgram);

  const { data: submissions } = await dbQuery;

  const filtered = submissions?.filter((s) =>
    !q || s.title.toLowerCase().includes(q.toLowerCase())
  ) ?? [];

  const counts = {
    needsReview: submissions?.filter((s) => ["new","triaging","needs_info"].includes(s.status)).length ?? 0,
    total:       submissions?.length ?? 0,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Submissions</h1>
          <p className="text-sm text-vault-muted mt-0.5">
            {counts.needsReview > 0 && (
              <span className="text-yellow-400 font-medium">{counts.needsReview} need review · </span>
            )}
            {counts.total} total
          </p>
        </div>
      </div>

      {/* Tabs + filters */}
      <div className="space-y-3">
        {/* View tabs */}
        <div className="flex items-center gap-1 bg-vault-elevated border border-vault-border rounded-lg p-1 w-fit">
          {TRIAGE_TABS.map(({ label }, i) => {
            const href = i === 0
              ? "/dashboard/org/submissions"
              : i === 1
              ? "/dashboard/org/submissions?status=resolved"
              : "/dashboard/org/submissions?status=all";
            return (
              <Link
                key={label}
                href={href}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === i
                    ? "bg-vault-surface text-vault-text border border-vault-border"
                    : "text-vault-muted hover:text-vault-text"
                }`}
              >
                {label}
                {i === 0 && counts.needsReview > 0 && (
                  <span className="ml-1.5 text-[10px] bg-yellow-950/60 text-yellow-400 border border-yellow-900/50 px-1.5 py-0.5 rounded-full">
                    {counts.needsReview}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <form className="flex items-center gap-2 bg-vault-elevated border border-vault-border rounded-lg px-3 py-2 flex-1 min-w-[160px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-vault-muted shrink-0" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search submissions..."
              className="bg-transparent text-sm placeholder:text-vault-muted flex-1 outline-none"
            />
          </form>

          {/* Triage filters (Client-side interactive select elements) */}
          <TriageFilters
            programs={programs}
            filterSeverity={filterSeverity}
            filterProgram={filterProgram}
          />
        </div>
      </div>

      {/* Submissions list */}
      {filtered.length === 0 ? (
        <div className="vault-card flex flex-col items-center justify-center py-16 text-center">
          <Bug className="w-8 h-8 text-vault-muted mb-3 opacity-50" />
          <p className="font-medium mb-1">
            {q ? `No results for "${q}"` : "No submissions here"}
          </p>
          <p className="text-sm text-vault-muted">
            {view === 0 ? "You're all caught up 🎉" : "Nothing in this view yet"}
          </p>
        </div>
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {filtered.map((sub) => {
            const st  = STATUS_CFG[sub.status as SubmissionStatus] ?? STATUS_CFG.new;
            const prg = Array.isArray(sub.programs) ? sub.programs[0] : sub.programs;
            const res = Array.isArray(sub.profiles)  ? sub.profiles[0]  : sub.profiles;

            const aiMismatch =
              sub.ai_severity &&
              sub.ai_severity !== sub.severity &&
              ["critical","high"].includes(sub.ai_severity);

            return (
              <Link
                key={sub.id}
                href={`/dashboard/org/submissions/${sub.id}`}
                className="flex items-center gap-3 p-4 hover:bg-vault-elevated/50 transition-colors group"
              >
                {/* Severity dot */}
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${SEV_DOTS[sub.severity as SeverityLevel] ?? "bg-zinc-500"}`}
                  title={sub.severity}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                      {truncate(sub.title, 60)}
                    </p>
                    {/* AI flags */}
                    {sub.ai_duplicate_of && (
                      <span className="text-[10px] text-yellow-400 bg-yellow-950/40 border border-yellow-900/40 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5" /> Dup
                      </span>
                    )}
                    {aiMismatch && (
                      <span className="text-[10px] text-orange-400 bg-orange-950/40 border border-orange-900/40 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                        <Zap className="w-2.5 h-2.5" /> AI↑
                      </span>
                    )}
                    {sub.ai_confidence && (
                      <span className="text-[10px] text-vault-teal bg-vault-teal/10 border border-vault-teal/20 px-1.5 py-0.5 rounded shrink-0">
                        {Math.round(sub.ai_confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-vault-muted flex items-center gap-2 flex-wrap">
                    <span>{prg?.name}</span>
                    <span>·</span>
                    <span>{res?.full_name ?? res?.username ?? "Anonymous"}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(sub.created_at)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border hidden sm:flex items-center gap-1 ${st.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-vault-muted group-hover:text-vault-teal transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

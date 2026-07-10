import { createClient }   from "@/lib/supabase/server";
import { redirect }        from "next/navigation";
import Link                from "next/link";
import {
  Bug, Plus, Clock, CheckCircle2, XCircle,
  AlertTriangle, Search, ChevronRight,
} from "lucide-react";
import { formatRelativeTime, truncate } from "@/lib/utils";
import type { Metadata }              from "next";
import type { SubmissionStatus }      from "@/lib/supabase/types";

export const metadata: Metadata = { title: "My Reports" };

interface Props { searchParams: Promise<{ status?: string; q?: string }> }

const STATUS_MAP: Record<SubmissionStatus, { label: string; dot: string; badge: string }> = {
  new:        { label: "New",       dot: "bg-sky-400",     badge: "text-sky-400 bg-sky-950/50 border-sky-900/50"          },
  triaging:   { label: "Triaging",  dot: "bg-violet-400",  badge: "text-violet-400 bg-violet-950/50 border-violet-900/50" },
  needs_info: { label: "Info Req",  dot: "bg-yellow-400",  badge: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
  accepted:   { label: "Accepted",  dot: "bg-emerald-400", badge: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50"},
  rejected:   { label: "Rejected",  dot: "bg-red-400",     badge: "text-red-400 bg-red-950/50 border-red-900/50"          },
  duplicate:  { label: "Duplicate", dot: "bg-zinc-500",    badge: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"       },
  wont_fix:   { label: "Won't Fix", dot: "bg-zinc-600",    badge: "text-zinc-500 bg-zinc-900/50 border-zinc-800/50"       },
  resolved:   { label: "Resolved",  dot: "bg-teal-400",    badge: "text-teal-400 bg-teal-950/50 border-teal-900/50"       },
};

const SEV_DOTS: Record<string, string> = {
  critical: "bg-red-400", high: "bg-orange-400", medium: "bg-yellow-400",
  low: "bg-blue-400", info: "bg-zinc-500",
};

export default async function MySubmissionsPage(props: Props) {
  const searchParams = await props.searchParams;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const filterStatus = searchParams.status as SubmissionStatus | undefined;
  const q            = searchParams.q ?? "";

  let dbQuery = supabase
    .from("submissions")
    .select("id, title, severity, status, created_at, updated_at, ai_duplicate_of, programs(name, id)")
    .eq("researcher_id", user.id)
    .order("created_at", { ascending: false });

  if (filterStatus) dbQuery = dbQuery.eq("status", filterStatus);

  const { data: submissions } = await dbQuery;

  const filtered = submissions?.filter((s) =>
    !q || s.title.toLowerCase().includes(q.toLowerCase())
  ) ?? [];

  const counts = submissions?.reduce(
    (a, s) => { a[s.status] = (a[s.status] ?? 0) + 1; return a; },
    {} as Record<string, number>
  ) ?? {};

  const FILTER_TABS = [
    { label: "All",      value: undefined },
    { label: "New",      value: "new"       as SubmissionStatus },
    { label: "Triaging", value: "triaging"  as SubmissionStatus },
    { label: "Accepted", value: "accepted"  as SubmissionStatus },
    { label: "Rejected", value: "rejected"  as SubmissionStatus },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Reports</h1>
          <p className="text-sm text-vault-muted mt-0.5">
            {submissions?.length ?? 0} total submission{submissions?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/researcher/submissions/new" className="btn-teal flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Report
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-vault-elevated border border-vault-border rounded-lg p-1">
          {FILTER_TABS.map(({ label, value }) => {
            const active = filterStatus === value;
            const count  = value ? (counts[value] ?? 0) : (submissions?.length ?? 0);
            return (
              <Link
                key={label}
                href={value ? `?status=${value}${q ? `&q=${q}` : ""}` : `${q ? `?q=${q}` : ""}`}
                className={cn_simple(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  active
                    ? "bg-vault-surface text-vault-text border border-vault-border"
                    : "text-vault-muted hover:text-vault-text"
                )}
              >
                {label}
                <span className={cn_simple(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  active
                    ? "bg-vault-teal/20 text-vault-teal"
                    : "bg-vault-border text-vault-muted"
                )}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        <form className="flex items-center gap-2 bg-vault-elevated border border-vault-border rounded-lg px-3 py-2 flex-1 min-w-[160px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-vault-muted shrink-0" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search reports..."
            className="bg-transparent text-sm placeholder:text-vault-muted flex-1 outline-none"
          />
          {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
        </form>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="vault-card flex flex-col items-center justify-center py-16 text-center">
          <Bug className="w-8 h-8 text-vault-muted mb-3 opacity-50" />
          <p className="font-medium mb-1">
            {q ? `No reports matching "${q}"` : "No reports yet"}
          </p>
          <p className="text-sm text-vault-muted mb-5">
            {q ? "Try a different search" : "Find a program and submit your first vulnerability report"}
          </p>
          {!q && (
            <Link href="/dashboard/researcher/programs" className="btn-teal flex items-center gap-2">
              <Bug className="w-4 h-4" /> Browse Programs
            </Link>
          )}
        </div>
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {filtered.map((sub) => {
            const st  = STATUS_MAP[sub.status as SubmissionStatus] ?? STATUS_MAP.new;
            const prg = Array.isArray(sub.programs) ? sub.programs[0] : sub.programs;
            return (
              <Link
                key={sub.id}
                href={`/dashboard/researcher/submissions/${sub.id}`}
                className="flex items-center gap-4 p-4 hover:bg-vault-elevated/50 transition-colors group"
              >
                {/* Status badge */}
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${st.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                    {truncate(sub.title, 65)}
                  </p>
                  <p className="text-xs text-vault-muted mt-0.5 flex items-center gap-2">
                    <span>{prg?.name ?? "Unknown program"}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(sub.created_at)}</span>
                    {sub.ai_duplicate_of && (
                      <><span>·</span>
                      <span className="text-yellow-400 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> Flagged duplicate
                      </span></>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${SEV_DOTS[sub.severity] ?? "bg-zinc-500"}`} title={sub.severity} />
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

function cn_simple(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

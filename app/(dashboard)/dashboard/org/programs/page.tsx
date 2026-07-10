import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import Link              from "next/link";
import {
  Plus, Target, Bug, Trophy, Clock,
  Globe, Lock, ChevronRight, Search,
} from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { Metadata }     from "next";
import type { ProgramStatus } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Programs" };

const STATUS_TABS: { label: string; value: ProgramStatus | "all" }[] = [
  { label: "All",      value: "all"      },
  { label: "Active",   value: "active"   },
  { label: "Draft",    value: "draft"    },
  { label: "Paused",   value: "paused"   },
  { label: "Archived", value: "archived" },
];

const STATUS_STYLES: Record<ProgramStatus, { dot: string; badge: string }> = {
  active:   { dot: "bg-emerald-400", badge: "text-emerald-400 bg-emerald-950/60 border-emerald-900/50" },
  draft:    { dot: "bg-zinc-500",    badge: "text-zinc-400   bg-zinc-800/60    border-zinc-700/50"    },
  paused:   { dot: "bg-yellow-400",  badge: "text-yellow-400 bg-yellow-950/60  border-yellow-900/50"  },
  archived: { dot: "bg-zinc-600",    badge: "text-zinc-500   bg-zinc-900/60    border-zinc-800/50"    },
};

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function ProgramsPage(props: Props) {
  const searchParams = await props.searchParams;
  const supabase   = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/dashboard/org");

  const filterStatus = searchParams.status as ProgramStatus | undefined;
  const query        = searchParams.q ?? "";

  let dbQuery = supabase
    .from("programs")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  if (filterStatus && (filterStatus as string) !== "all") {
    dbQuery = dbQuery.eq("status", filterStatus);
  }

  const { data: programs } = await dbQuery;

  // Client-side text filter (tiny dataset at this stage)
  const filtered = programs?.filter((p) =>
    !query || p.name.toLowerCase().includes(query.toLowerCase())
  ) ?? [];

  // Count per status for tab badges
  const counts = programs?.reduce(
    (acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  ) ?? {};

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Programs</h1>
          <p className="text-sm text-vault-muted mt-0.5">
            {programs?.length ?? 0} program{programs?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/org/programs/new" className="btn-teal flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Program
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-vault-elevated border border-vault-border rounded-lg p-1">
          {STATUS_TABS.map(({ label, value }) => {
            const active = (filterStatus ?? "all") === value;
            const count  = value === "all" ? (programs?.length ?? 0) : (counts[value] ?? 0);
            return (
              <Link
                key={value}
                href={`/dashboard/org/programs${value !== "all" ? `?status=${value}` : ""}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  active
                    ? "bg-vault-surface text-vault-text border border-vault-border shadow-sm"
                    : "text-vault-muted hover:text-vault-text"
                }`}
              >
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? "bg-vault-teal/20 text-vault-teal" : "bg-vault-border text-vault-muted"
                }`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <form className="flex items-center gap-2 bg-vault-elevated border border-vault-border rounded-lg px-3 py-2 flex-1 min-w-[160px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-vault-muted shrink-0" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search programs..."
            className="bg-transparent text-sm text-vault-text placeholder:text-vault-muted flex-1 outline-none"
          />
          {filterStatus && (
            <input type="hidden" name="status" value={filterStatus} />
          )}
        </form>
      </div>

      {/* Program grid */}
      {filtered.length === 0 ? (
        <div className="vault-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-vault-elevated border border-vault-border flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-vault-muted" />
          </div>
          <p className="font-medium mb-1">
            {query ? `No programs matching "${query}"` : "No programs yet"}
          </p>
          <p className="text-sm text-vault-muted mb-5 max-w-xs">
            {query
              ? "Try a different search term"
              : "Create your first bug bounty or VDP program to start receiving vulnerability reports"}
          </p>
          {!query && (
            <Link href="/dashboard/org/programs/new" className="btn-teal flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create your first program
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((program) => {
            const st = STATUS_STYLES[program.status as ProgramStatus];
            return (
              <Link
                key={program.id}
                href={`/dashboard/org/programs/${program.id}`}
                className="vault-card p-5 hover:border-vault-border-bright transition-all duration-150 group flex items-start gap-4"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0 group-hover:bg-vault-teal/15 transition-colors">
                  <Target className="w-5 h-5 text-vault-teal" />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <h2 className="font-medium group-hover:text-vault-teal transition-colors truncate">
                      {program.name}
                    </h2>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize inline-flex items-center gap-1 ${st.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {program.status}
                    </span>
                    <span className="text-[10px] text-vault-muted border border-vault-border rounded px-1.5 py-0.5 capitalize">
                      {program.type.replace("_", " ")}
                    </span>
                    {program.is_public
                      ? <Globe className="w-3 h-3 text-vault-muted" />
                      : <Lock  className="w-3 h-3 text-vault-muted" />}
                  </div>

                  <p className="text-sm text-vault-muted line-clamp-1 mb-3">
                    {program.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-vault-muted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Bug className="w-3 h-3" />
                      {program.total_submissions} submissions
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {program.min_reward && program.max_reward
                        ? `${formatCurrency(program.min_reward)} – ${formatCurrency(program.max_reward)}`
                        : program.type === "vdp" ? "No rewards (VDP)" : "Rewards TBD"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(program.created_at)}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-vault-muted shrink-0 mt-1 group-hover:text-vault-teal transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

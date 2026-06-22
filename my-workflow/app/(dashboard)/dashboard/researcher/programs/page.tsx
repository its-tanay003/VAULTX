import { createClient }     from "@/lib/supabase/server";
import { redirect }          from "next/navigation";
import Link                  from "next/link";
import {
  Target, Search, Globe, Bug,
  Trophy, Clock, ChevronRight, Filter,
} from "lucide-react";
import { formatCurrency }    from "@/lib/utils";
import type { Metadata } from "next";
import type { ProgramType } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Browse Programs" };

interface Props {
  searchParams: { q?: string; type?: string };
}

export default async function ResearcherProgramsPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const q    = searchParams.q    ?? "";
  const type = searchParams.type ?? "all";

  let dbQuery = supabase
    .from("programs")
    .select(`
      id, name, slug, type, status, description,
      min_reward, max_reward, total_submissions, is_public,
      avg_response_hours, scope_in,
      organizations!inner(name, logo_url)
    `)
    .eq("status", "active")
    .eq("is_public", true)
    .order("total_submissions", { ascending: false });

  if (type !== "all") dbQuery = dbQuery.eq("type", type as ProgramType);

  const { data: programs } = await dbQuery;

  const filtered = programs?.filter((p) =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.description.toLowerCase().includes(q.toLowerCase())
  ) ?? [];

  // Check which programs this researcher already submitted to
  const { data: mySubmissions } = await supabase
    .from("submissions")
    .select("program_id")
    .eq("researcher_id", user.id);

  const submittedProgramIds = new Set(mySubmissions?.map((s) => s.program_id) ?? []);

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Browse Programs</h1>
        <p className="text-sm text-vault-muted mt-0.5">
          {filtered.length} active program{filtered.length !== 1 ? "s" : ""} available
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <form className="flex items-center gap-2 bg-vault-elevated border border-vault-border rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-vault-muted shrink-0" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search programs, companies..."
            className="bg-transparent text-sm text-vault-text placeholder:text-vault-muted flex-1 outline-none"
          />
          {type !== "all" && <input type="hidden" name="type" value={type} />}
        </form>

        <div className="flex items-center gap-1 bg-vault-elevated border border-vault-border rounded-lg p-1">
          {[
            { label: "All",        value: "all"       },
            { label: "Bug Bounty", value: "bug_bounty"},
            { label: "VDP",        value: "vdp"       },
          ].map(({ label, value }) => (
            <Link
              key={value}
              href={`/dashboard/researcher/programs${value !== "all" ? `?type=${value}` : ""}${q ? `${value !== "all" ? "&" : "?"}q=${q}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                type === value
                  ? "bg-vault-surface text-vault-text border border-vault-border"
                  : "text-vault-muted hover:text-vault-text"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Program cards */}
      {filtered.length === 0 ? (
        <div className="vault-card flex flex-col items-center justify-center py-16 text-center">
          <Target className="w-8 h-8 text-vault-muted mb-3 opacity-50" />
          <p className="font-medium mb-1">No programs found</p>
          <p className="text-sm text-vault-muted">
            {q ? `Try a different search` : "No active programs right now — check back soon"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((program) => {
            const org = Array.isArray(program.organizations)
              ? program.organizations[0]
              : program.organizations;
            const alreadySubmitted = submittedProgramIds.has(program.id);

            return (
              <div key={program.id} className="vault-card p-5 hover:border-vault-border-bright transition-all group">
                <div className="flex items-start gap-4">
                  {/* Org logo / placeholder */}
                  <div className="w-10 h-10 rounded-xl bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0 text-sm font-semibold text-vault-teal">
                    {org?.name?.[0] ?? "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <Link
                            href={`/dashboard/researcher/programs/${program.id}`}
                            className="font-medium hover:text-vault-teal transition-colors"
                          >
                            {program.name}
                          </Link>
                          <span className="text-[10px] text-vault-muted border border-vault-border rounded px-1.5 py-0.5 capitalize">
                            {program.type.replace("_", " ")}
                          </span>
                          {alreadySubmitted && (
                            <span className="text-[10px] text-vault-teal border border-vault-teal/30 bg-vault-teal/5 rounded px-1.5 py-0.5">
                              ✓ Submitted
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-vault-muted">{org?.name}</p>
                      </div>

                      <Link
                        href={`/dashboard/researcher/submissions/new?program=${program.id}`}
                        className="btn-teal text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0"
                      >
                        <Bug className="w-3 h-3" />
                        Submit Report
                      </Link>
                    </div>

                    <p className="text-sm text-vault-muted mt-2 line-clamp-2 leading-relaxed">
                      {program.description}
                    </p>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-vault-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-vault-teal" />
                        {program.type === "vdp"
                          ? "VDP — no rewards"
                          : program.min_reward && program.max_reward
                          ? `${formatCurrency(program.min_reward)} – ${formatCurrency(program.max_reward)}`
                          : "Rewards available"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bug className="w-3 h-3" />
                        {program.total_submissions} reports
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {program.avg_response_hours}h avg response
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {program.scope_in.length} asset{program.scope_in.length !== 1 ? "s" : ""} in scope
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

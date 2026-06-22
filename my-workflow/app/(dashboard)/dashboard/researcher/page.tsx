import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Bug, Target, Trophy, Star, ArrowRight, FileSearch,
  Clock, CheckCircle2, Zap,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatRelativeTime, truncate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Researcher Dashboard" };

export default async function ResearcherDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: mySubmissions }, { data: featuredPrograms }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("submissions")
        .select("id, title, severity, status, created_at, programs(name)")
        .eq("researcher_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("programs")
        .select("id, name, type, min_reward, max_reward, total_submissions, status")
        .eq("status", "active")
        .eq("is_public", true)
        .order("total_submissions", { ascending: false })
        .limit(5),
    ]);

  if (!profile) redirect("/login");

  const accepted     = mySubmissions?.filter((s) => s.status === "accepted").length    ?? 0;
  const totalReports = mySubmissions?.length ?? 0;
  const successRate  = totalReports > 0 ? Math.round((accepted / totalReports) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Welcome back, {profile.full_name?.split(" ")[0] ?? "Researcher"} 👋
          </h1>
          <p className="text-sm text-vault-muted mt-0.5 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-yellow-400" />
            Reputation: <span className="text-vault-text font-medium">{profile.reputation ?? 0} pts</span>
          </p>
        </div>
        <Link href="/dashboard/researcher/programs" className="btn-teal flex items-center gap-2">
          <Target className="w-4 h-4" />
          Browse Programs
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Reports"
          value={totalReports}
          trend={0}
          trendLabel="all time"
          icon={<Bug className="w-4 h-4" />}
          accent="teal"
        />
        <StatCard
          label="Accepted"
          value={accepted}
          trend={0}
          trendLabel="total"
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="green"
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={<Zap className="w-4 h-4" />}
          accent="amber"
        />
        <StatCard
          label="Total Earned"
          value={formatCurrency(0)}
          icon={<Trophy className="w-4 h-4" />}
          accent="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* My reports */}
        <div className="lg:col-span-3 vault-card">
          <div className="flex items-center justify-between p-4 border-b border-vault-border">
            <h2 className="text-sm font-medium">My Reports</h2>
            <Link
              href="/dashboard/researcher/submissions"
              className="text-xs text-vault-teal hover:text-vault-teal/80 transition-colors flex items-center gap-1"
            >
              All reports <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!mySubmissions?.length ? (
            <EmptyState
              icon={<FileSearch className="w-6 h-6 text-vault-muted" />}
              title="No reports yet"
              description="Browse active programs and submit your first vulnerability report"
              action={{ href: "/dashboard/researcher/programs", label: "Browse programs" }}
            />
          ) : (
            <div className="divide-y divide-vault-border">
              {mySubmissions.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/dashboard/researcher/submissions/${sub.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-vault-elevated/50 transition-colors group"
                >
                  <SubmissionStatusBadge status={sub.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                      {truncate(sub.title, 55)}
                    </div>
                    <div className="text-xs text-vault-muted mt-0.5 flex items-center gap-2">
                      <span>{((sub as any).programs as { name: string } | null)?.name}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(sub.created_at)}</span>
                    </div>
                  </div>
                  <SeverityDot severity={sub.severity} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Featured programs */}
        <div className="lg:col-span-2 vault-card">
          <div className="flex items-center justify-between p-4 border-b border-vault-border">
            <h2 className="text-sm font-medium">Featured Programs</h2>
            <Link
              href="/dashboard/researcher/programs"
              className="text-xs text-vault-teal hover:text-vault-teal/80 transition-colors flex items-center gap-1"
            >
              Browse all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!featuredPrograms?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Target className="w-6 h-6 text-vault-muted mb-3 opacity-60" />
              <p className="text-sm text-vault-muted">No active programs yet</p>
            </div>
          ) : (
            <div className="divide-y divide-vault-border">
              {featuredPrograms.map((prog) => (
                <Link
                  key={prog.id}
                  href={`/dashboard/researcher/programs/${prog.id}`}
                  className="flex items-start gap-3 p-4 hover:bg-vault-elevated/50 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Target className="w-3.5 h-3.5 text-vault-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                      {prog.name}
                    </div>
                    <div className="text-xs text-vault-muted mt-0.5">
                      {prog.min_reward && prog.max_reward
                        ? `${formatCurrency(prog.min_reward)} – ${formatCurrency(prog.max_reward)}`
                        : prog.type === "vdp"
                        ? "VDP (no rewards)"
                        : "Rewards TBD"}
                    </div>
                  </div>
                  <div className="text-[10px] text-vault-muted text-right shrink-0">
                    <div className="font-medium text-vault-subtle">{prog.total_submissions}</div>
                    <div>reports</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tips for new researchers */}
      {totalReports === 0 && (
        <div className="vault-card p-5 border-vault-teal/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-vault-teal" />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">Getting started as a researcher</h3>
              <ol className="text-sm text-vault-muted space-y-1.5 list-decimal ml-4">
                <li>Browse active programs and read their scope + rules carefully</li>
                <li>Start with lower-competition VDP programs to build reputation</li>
                <li>Write clear, reproducible reports with proof-of-concept</li>
                <li>Our AI pre-screens for duplicates — be specific with your findings</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  new:        { label: "New",      cls: "text-sky-400 bg-sky-950/50 border-sky-900/50" },
  triaging:   { label: "Triaging", cls: "text-violet-400 bg-violet-950/50 border-violet-900/50" },
  accepted:   { label: "Accepted", cls: "text-green-400 bg-green-950/50 border-green-900/50" },
  rejected:   { label: "Rejected", cls: "text-red-400 bg-red-950/50 border-red-900/50" },
  duplicate:  { label: "Duplicate",cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50" },
  needs_info: { label: "Info Req", cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
  resolved:   { label: "Resolved", cls: "text-teal-400 bg-teal-950/50 border-teal-900/50" },
  wont_fix:   { label: "Won't Fix",cls: "text-zinc-500 bg-zinc-900/50 border-zinc-800/50" },
};

function SubmissionStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.new;
  return (
    <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

const SEV_DOTS: Record<string, string> = {
  critical: "bg-red-400",
  high:     "bg-orange-400",
  medium:   "bg-yellow-400",
  low:      "bg-blue-400",
  info:     "bg-zinc-500",
};

function SeverityDot({ severity }: { severity: string }) {
  return (
    <span
      title={severity}
      className={`shrink-0 w-2 h-2 rounded-full ${SEV_DOTS[severity] ?? SEV_DOTS.info}`}
    />
  );
}

function EmptyState({
  icon, title, description, action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="mb-3 opacity-60">{icon}</div>
      <p className="text-sm font-medium mb-1">{title}</p>
      <p className="text-xs text-vault-muted mb-4 max-w-[200px]">{description}</p>
      {action && (
        <Link href={action.href} className="text-xs text-vault-teal hover:text-vault-teal/80 font-medium transition-colors">
          {action.label} →
        </Link>
      )}
    </div>
  );
}

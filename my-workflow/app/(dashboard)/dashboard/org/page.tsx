import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Bug, Target, Trophy, TrendingUp, Plus, ArrowRight,
  Clock, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatRelativeTime, truncate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organization Dashboard" };

export default async function OrgDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch profile + org in parallel
  const [{ data: profile }, { data: programs }, { data: recentSubmissions }] =
    await Promise.all([
      supabase.from("profiles").select("*, organizations!profiles_org_id_fkey(*)").eq("id", user.id).single(),
      supabase.from("programs").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("submissions")
        .select("id, title, severity, status, created_at, programs(name)")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  if (!profile) redirect("/login");

  const org = Array.isArray(profile.organizations)
    ? profile.organizations[0]
    : profile.organizations;

  // Aggregate stats
  const totalPrograms   = programs?.length ?? 0;
  const activePrograms  = programs?.filter((p) => p.status === "active").length ?? 0;
  const totalSubs       = recentSubmissions?.length ?? 0;
  const acceptedSubs    = recentSubmissions?.filter((s) => s.status === "accepted").length ?? 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {org?.name ?? "Your Organization"}
          </h1>
          <p className="text-sm text-vault-muted mt-0.5">
            Security program overview
          </p>
        </div>
        <Link
          href="/dashboard/org/programs/new"
          className="btn-teal flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Program
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Programs"
          value={activePrograms}
          trend={0}
          trendLabel="vs last month"
          icon={<Target className="w-4 h-4" />}
          accent="teal"
        />
        <StatCard
          label="Total Submissions"
          value={totalSubs}
          trend={12}
          trendLabel="this week"
          icon={<Bug className="w-4 h-4" />}
          accent="blue"
        />
        <StatCard
          label="Acceptance Rate"
          value={totalSubs > 0 ? `${Math.round((acceptedSubs / totalSubs) * 100)}%` : "—"}
          trend={-3}
          trendLabel="vs avg"
          icon={<TrendingUp className="w-4 h-4" />}
          accent="green"
        />
        <StatCard
          label="Total Paid"
          value={formatCurrency(0)}
          trend={0}
          trendLabel="all time"
          icon={<Trophy className="w-4 h-4" />}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent submissions */}
        <div className="lg:col-span-3 vault-card">
          <div className="flex items-center justify-between p-4 border-b border-vault-border">
            <h2 className="text-sm font-medium">Recent Submissions</h2>
            <Link
              href="/dashboard/org/submissions"
              className="text-xs text-vault-teal hover:text-vault-teal/80 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!recentSubmissions?.length ? (
            <EmptyState
              icon={<Bug className="w-6 h-6 text-vault-muted" />}
              title="No submissions yet"
              description="Create an active program to start receiving vulnerability reports"
              action={{ href: "/dashboard/org/programs/new", label: "Create program" }}
            />
          ) : (
            <div className="divide-y divide-vault-border">
              {recentSubmissions.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/dashboard/org/submissions/${sub.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-vault-elevated/50 transition-colors group"
                >
                  <StatusIcon status={sub.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                      {truncate(sub.title, 60)}
                    </div>
                    <div className="text-xs text-vault-muted mt-0.5 flex items-center gap-2">
                      <span>{((sub as any).programs as { name: string } | null)?.name}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(sub.created_at)}</span>
                    </div>
                  </div>
                  <SeverityBadge severity={sub.severity} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Programs list */}
        <div className="lg:col-span-2 vault-card">
          <div className="flex items-center justify-between p-4 border-b border-vault-border">
            <h2 className="text-sm font-medium">Programs</h2>
            <Link
              href="/dashboard/org/programs"
              className="text-xs text-vault-teal hover:text-vault-teal/80 transition-colors flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!programs?.length ? (
            <EmptyState
              icon={<Target className="w-6 h-6 text-vault-muted" />}
              title="No programs"
              description="Launch your first bug bounty or VDP program"
              action={{ href: "/dashboard/org/programs/new", label: "Create program" }}
            />
          ) : (
            <div className="divide-y divide-vault-border">
              {programs.map((prog) => (
                <Link
                  key={prog.id}
                  href={`/dashboard/org/programs/${prog.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-vault-elevated/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                      {prog.name}
                    </div>
                    <div className="text-xs text-vault-muted mt-0.5 flex items-center gap-2">
                      <span className="capitalize">{prog.type.replace("_", " ")}</span>
                      <span>·</span>
                      <span>{prog.total_submissions} reports</span>
                    </div>
                  </div>
                  <ProgramStatusBadge status={prog.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="vault-card p-4">
        <h2 className="text-sm font-medium mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/org/programs/new",    label: "New Program",        icon: Target },
            { href: "/dashboard/org/submissions",     label: "Review Queue",       icon: Clock },
            { href: "/dashboard/org/rewards",         label: "Pending Rewards",    icon: Trophy },
            { href: "/dashboard/org/settings",        label: "Org Settings",       icon: AlertTriangle },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border border-vault-border bg-vault-elevated hover:border-vault-teal/40 hover:bg-vault-teal/5 transition-all duration-150 text-center"
            >
              <Icon className="w-5 h-5 text-vault-teal" />
              <span className="text-xs font-medium text-vault-subtle">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function StatusIcon({ status }: { status: string }) {
  const icons: Record<string, React.ReactNode> = {
    new:        <Clock        className="w-4 h-4 text-sky-400"     />,
    triaging:   <Clock        className="w-4 h-4 text-violet-400"  />,
    accepted:   <CheckCircle2 className="w-4 h-4 text-green-400"   />,
    rejected:   <XCircle      className="w-4 h-4 text-red-400"     />,
    duplicate:  <XCircle      className="w-4 h-4 text-zinc-500"    />,
    needs_info: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
    resolved:   <CheckCircle2 className="w-4 h-4 text-teal-400"    />,
  };
  return <>{icons[status] ?? <Clock className="w-4 h-4 text-vault-muted" />}</>;
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
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${map[severity] ?? map.info}`}>
      {severity}
    </span>
  );
}

function ProgramStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:   { label: "Active",   cls: "text-green-400 bg-green-950/50 border-green-900/50" },
    draft:    { label: "Draft",    cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50" },
    paused:   { label: "Paused",   cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
    archived: { label: "Archived", cls: "text-zinc-500 bg-zinc-900/50 border-zinc-800/50" },
  };
  const cfg = map[status] ?? map.draft;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.cls}`}>
      {cfg.label}
    </span>
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
        <Link
          href={action.href}
          className="text-xs text-vault-teal hover:text-vault-teal/80 transition-colors font-medium"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}

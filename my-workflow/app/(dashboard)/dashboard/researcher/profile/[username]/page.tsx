import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import {
  Trophy, Bug, DollarSign, Globe, Github, Twitter,
  CheckCircle2, Calendar, ChevronLeft,
} from "lucide-react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import type { Metadata } from "next";

interface Props { params: { username: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `@${params.username}` };
}

export default async function ResearcherProfilePage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Try username first, fall back to ID (for leaderboard links without username)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.eq.${params.username},id.eq.${params.username}`)
    .eq("role", "researcher")
    .single();

  if (!profile) notFound();

  const isOwnProfile = profile.id === user.id;

  // Stats
  const [{ data: submissions }, { data: earnings }, { data: leaderboardEntry }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, severity, status, created_at")
      .eq("researcher_id", profile.id),
    supabase
      .from("rewards")
      .select("amount")
      .eq("researcher_id", profile.id)
      .eq("status", "paid"),
    supabase
      .from("leaderboard")
      .select("*")
      .eq("id", profile.id)
      .single(),
  ]);

  const subs          = submissions ?? [];
  const acceptedCount = subs.filter((s) => ["accepted","resolved"].includes(s.status)).length;
  const totalEarned   = (earnings ?? []).reduce((s, r) => s + r.amount, 0);
  const successRate   = subs.length > 0 ? Math.round((acceptedCount / subs.length) * 100) : 0;

  const severityCounts = subs.reduce((acc, s) => {
    if (["accepted","resolved"].includes(s.status)) {
      acc[s.severity] = (acc[s.severity] ?? 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const SEV_COLORS: Record<string, string> = {
    critical: "bg-red-400", high: "bg-orange-400", medium: "bg-yellow-400",
    low: "bg-blue-400", info: "bg-zinc-400",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/researcher/leaderboard" className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-semibold">Researcher Profile</h1>
      </div>

      {/* Profile header */}
      <div className="vault-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center text-xl font-semibold text-vault-teal shrink-0 overflow-hidden">
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
              : getInitials(profile.full_name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-lg font-semibold">{profile.full_name ?? "Anonymous Researcher"}</h2>
              {leaderboardEntry && (
                <span className="text-[10px] font-medium px-2 py-0.5 bg-vault-teal/10 text-vault-teal border border-vault-teal/20 rounded-full">
                  Rank available on leaderboard
                </span>
              )}
            </div>
            <p className="text-sm text-vault-muted">@{profile.username ?? "researcher"}</p>

            {profile.bio && (
              <p className="text-sm text-vault-subtle mt-3 leading-relaxed">{profile.bio}</p>
            )}

            {/* Links */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-vault-muted hover:text-vault-teal transition-colors">
                  <Globe className="w-3.5 h-3.5" /> Website
                </a>
              )}
              {profile.github && (
                <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-vault-muted hover:text-vault-teal transition-colors">
                  <Github className="w-3.5 h-3.5" /> @{profile.github}
                </a>
              )}
              {profile.twitter && (
                <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-vault-muted hover:text-vault-teal transition-colors">
                  <Twitter className="w-3.5 h-3.5" /> @{profile.twitter}
                </a>
              )}
              <span className="flex items-center gap-1.5 text-xs text-vault-muted">
                <Calendar className="w-3.5 h-3.5" /> Joined {formatDate(profile.created_at)}
              </span>
            </div>
          </div>

          {isOwnProfile && (
            <Link href="/dashboard/settings/profile" className="btn-ghost text-xs shrink-0">
              Edit Profile
            </Link>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={<Trophy className="w-4 h-4" />}      label="Reputation"   value={profile.reputation} accent="teal" />
        <MiniStat icon={<Bug className="w-4 h-4" />}         label="Accepted"     value={acceptedCount}      accent="green" />
        <MiniStat icon={<CheckCircle2 className="w-4 h-4" />}label="Success Rate" value={`${successRate}%`}  accent="blue" />
        <MiniStat icon={<DollarSign className="w-4 h-4" />}  label="Earned"       value={formatCurrency(totalEarned)} accent="amber" />
      </div>

      {/* Severity breakdown */}
      {Object.keys(severityCounts).length > 0 && (
        <div className="vault-card p-5">
          <h3 className="text-sm font-medium mb-3">Accepted Findings by Severity</h3>
          <div className="space-y-2.5">
            {(["critical","high","medium","low","info"] as const).map((sev) => {
              const count = severityCounts[sev] ?? 0;
              if (count === 0) return null;
              const max = Math.max(...Object.values(severityCounts));
              return (
                <div key={sev} className="flex items-center gap-3">
                  <span className="text-xs text-vault-muted w-14 capitalize shrink-0">{sev}</span>
                  <div className="flex-1 bg-vault-elevated rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${SEV_COLORS[sev]}`}
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-6 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  icon, label, value, accent,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  accent: "teal"|"green"|"blue"|"amber";
}) {
  const colors = {
    teal:  "text-teal-400 bg-teal-950/50 border-teal-900/40",
    green: "text-green-400 bg-green-950/50 border-green-900/40",
    blue:  "text-blue-400 bg-blue-950/50 border-blue-900/40",
    amber: "text-amber-400 bg-amber-950/50 border-amber-900/40",
  };
  return (
    <div className="vault-card p-3.5 text-center">
      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center mx-auto mb-2 ${colors[accent]}`}>
        {icon}
      </div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-vault-muted">{label}</p>
    </div>
  );
}

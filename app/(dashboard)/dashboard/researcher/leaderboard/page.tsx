import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import Link               from "next/link";
import Image              from "next/image";
import { Trophy, Medal, Award, Bug, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency, getInitials } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leaderboard" };

const RANK_STYLES = [
  { bg: "bg-yellow-500/10 border-yellow-500/30", icon: <Trophy className="w-4 h-4 text-yellow-400" />, ring: "ring-yellow-500/40" },
  { bg: "bg-zinc-400/10 border-zinc-400/30",      icon: <Medal  className="w-4 h-4 text-zinc-300" />,   ring: "ring-zinc-400/40"  },
  { bg: "bg-orange-700/10 border-orange-700/30",  icon: <Award  className="w-4 h-4 text-orange-400" />, ring: "ring-orange-600/40"},
];

export default async function LeaderboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load leaderboard statistics
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, reputation")
    .order("reputation", { ascending: false })
    .limit(100);

  const { data: solvedStats } = await supabase
    .from("submissions")
    .select("researcher_id, status")
    .eq("status", "accepted");

  const { data: payoutStats } = await supabase
    .from("rewards")
    .select("researcher_id, amount, status")
    .eq("status", "paid");

  // Aggregate stats
  const rows = (profiles ?? []).map((p) => {
    const accepted = (solvedStats ?? []).filter((s) => s.researcher_id === p.id).length;
    const earned   = (payoutStats ?? []).filter((pay) => pay.researcher_id === p.id).reduce((sum, r) => sum + r.amount, 0);
    return {
      ...p,
      accepted_count: accepted,
      total_earned:   earned,
    };
  });

  const myRank = rows.findIndex((r) => r.id === user.id);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-vault-teal" /> Global Leaderboard
        </h1>
        <p className="text-sm text-vault-muted mt-0.5">
          Top security researchers ranked by reputation points
        </p>
      </div>

      {/* Your rank card */}
      {myRank >= 0 && (
        <div className="vault-card p-4 border-vault-teal/30 bg-vault-teal/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-vault-teal/20 border border-vault-teal/30 flex items-center justify-center text-vault-teal text-sm font-semibold shrink-0">
              #{myRank + 1}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Your rank</p>
              <p className="text-xs text-vault-muted">
                {rows[myRank].reputation} reputation points · {rows[myRank].accepted_count} accepted reports
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 0, 2].map((idx) => {
            const r = rows[idx];
            if (!r) return <div key={idx} />;
            const style = RANK_STYLES[idx];
            return (
              <div
                key={r.id}
                className={`vault-card p-4 text-center ${idx === 0 ? "scale-105 ring-2" : ""} ${style.ring}`}
                style={idx === 0 ? { marginTop: "-8px" } : undefined}
              >
                <div className={`w-12 h-12 rounded-full ${style.bg} border flex items-center justify-center mx-auto mb-2 relative overflow-hidden`}>
                  {r.avatar_url ? (
                    <Image src={r.avatar_url} width={48} height={48} className="w-full h-full rounded-full object-cover" alt="" />
                  ) : (
                    <span className="text-sm font-semibold text-vault-text">
                      {getInitials(r.full_name)}
                    </span>
                  )}
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-vault-bg border border-vault-border flex items-center justify-center">
                    {style.icon}
                  </div>
                </div>
                <p className="text-sm font-medium truncate">{r.full_name ?? r.username ?? "Anonymous"}</p>
                <p className="text-xs text-vault-teal font-semibold mt-1">{r.reputation} pts</p>
                <p className="text-[11px] text-vault-muted mt-0.5">{r.accepted_count} accepted</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="vault-card divide-y divide-vault-border">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="w-8 h-8 text-vault-muted mb-3 opacity-50" />
            <p className="text-sm text-vault-muted">No researchers ranked yet</p>
          </div>
        ) : (
          rows.map((r, i) => (
            <Link
              key={r.id}
              href={`/dashboard/researcher/profile/${r.username ?? r.id}`}
              className={`flex items-center gap-4 p-4 hover:bg-vault-elevated/50 transition-colors group ${
                r.id === user.id ? "bg-vault-teal/[0.03]" : ""
              }`}
            >
              <span className={`w-7 text-center text-sm font-medium shrink-0 ${
                i < 3 ? "text-vault-teal" : "text-vault-muted"
              }`}>
                {i + 1}
              </span>

              <div className="w-8 h-8 rounded-full bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center text-xs font-medium text-vault-teal shrink-0 overflow-hidden relative">
                {r.avatar_url ? (
                  <Image src={r.avatar_url} width={32} height={32} className="w-full h-full object-cover" alt="" />
                ) : (
                  getInitials(r.full_name)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                  {r.full_name ?? r.username ?? "Anonymous"}
                  {r.id === user.id && <span className="text-vault-muted font-normal"> (you)</span>}
                </p>
                <p className="text-xs text-vault-muted">@{r.username ?? "researcher"}</p>
              </div>

              <div className="hidden sm:flex items-center gap-4 text-xs text-vault-muted shrink-0">
                <span className="flex items-center gap-1">
                  <Bug className="w-3 h-3" /> {r.accepted_count}
                </span>
                {r.total_earned > 0 && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> {formatCurrency(r.total_earned)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-sm font-semibold text-vault-teal shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
                {r.reputation}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

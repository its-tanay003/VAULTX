"use client";

import { useEffect, useState } from "react";
import { createClient }        from "@/lib/supabase/client";
import { Trophy, TrendingUp }  from "lucide-react";
import { getInitials }         from "@/lib/utils";
import { cn }                  from "@/lib/utils";

interface ScoreEntry {
  researcher_id: string;
  username:      string | null;
  full_name:     string | null;
  avatar_url:    string | null;
  solve_count:   number;
  total_points:  number;
  last_solve_at: string;
}

interface Props {
  entries:       ScoreEntry[];
  currentUserId: string;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export function LiveScoreboard({ entries: initial, currentUserId }: Props) {
  const [entries, setEntries] = useState<ScoreEntry[]>(initial);

  useEffect(() => {
    const supabase = createClient();

    // Reload scoreboard on every new solve — simpler than trying to
    // maintain client-side score state incrementally
    const channel = supabase
      .channel("ctf-solves-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ctf_solves" },
        async () => {
          const { data } = await supabase
            .from("ctf_scoreboard")
            .select("*")
            .order("total_points", { ascending: false })
            .limit(20);
          if (data) setEntries(data);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="vault-card p-4 sticky top-4">
      <h2 className="text-sm font-medium flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-vault-teal" /> Scoreboard
        <span className="ml-auto text-[10px] text-vault-teal bg-vault-teal/10 border border-vault-teal/20 px-1.5 py-0.5 rounded">
          Live
        </span>
      </h2>

      {entries.length === 0 ? (
        <div className="text-center py-6">
          <TrendingUp className="w-6 h-6 text-vault-muted mx-auto mb-2 opacity-50" />
          <p className="text-xs text-vault-muted">No solves yet — be first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const isMe = entry.researcher_id === currentUserId;
            return (
              <div
                key={entry.researcher_id}
                className={cn(
                  "flex items-center gap-2.5 p-2 rounded-lg transition-colors",
                  isMe ? "bg-vault-teal/5 border border-vault-teal/20" : "hover:bg-vault-elevated/50"
                )}
              >
                <span className="w-5 text-center text-xs shrink-0">
                  {i < 3 ? MEDAL[i] : <span className="text-vault-muted font-medium">{i + 1}</span>}
                </span>
                <div className="w-6 h-6 rounded-full bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center text-[10px] font-medium text-vault-teal shrink-0 overflow-hidden">
                  {entry.avatar_url
                    ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                    : getInitials(entry.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {entry.full_name ?? entry.username ?? "Anonymous"}
                    {isMe && <span className="text-vault-muted font-normal"> (you)</span>}
                  </p>
                  <p className="text-[10px] text-vault-muted">{entry.solve_count} solve{entry.solve_count !== 1 ? "s" : ""}</p>
                </div>
                <p className="text-xs font-semibold text-vault-teal shrink-0">{entry.total_points}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

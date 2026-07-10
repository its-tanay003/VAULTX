import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import { ChevronLeft, Flag, Trophy, Clock } from "lucide-react";
import { FlagSubmitter }      from "@/components/ctf/flag-submitter";
import { LiveScoreboard }     from "@/components/ctf/live-scoreboard";
import { CountdownTimer }     from "@/components/ctf/countdown-timer";
import { formatDate }         from "@/lib/utils";
import type { Metadata }      from "next";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const supabase = createClient();
  const { data } = await supabase.from("ctf_competitions").select("title").eq("id", params.id).single();
  return { title: data?.title ? `${data.title} — Play` : "CTF" };
}

const DIFF_CFG = {
  easy:   { label: "Easy",   cls: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50" },
  medium: { label: "Medium", cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50"   },
  hard:   { label: "Hard",   cls: "text-orange-400 bg-orange-950/50 border-orange-900/50"   },
  insane: { label: "Insane", cls: "text-red-400 bg-red-950/50 border-red-900/50"             },
};

const CAT_COLORS: Record<string, string> = {
  web: "text-sky-400", crypto: "text-violet-400", reverse: "text-orange-400",
  pwn: "text-red-400", forensics: "text-teal-400", misc: "text-zinc-400",
  smart_contract: "text-emerald-400", cloud: "text-blue-400",
};

export default async function CTFPlayPage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: competition } = await supabase
    .from("ctf_competitions")
    .select("*, ctf_challenges(*)")
    .eq("id", params.id)
    .single();

  if (!competition) notFound();

  const now = new Date();
  const hasStarted = new Date(competition.starts_at) <= now;
  const hasEnded   = new Date(competition.ends_at) < now;
  const isLive     = competition.status === "active" && hasStarted && !hasEnded;

  // Access check: public competitions or org admin preview
  if (!competition.is_public && competition.status !== "active") {
    redirect("/dashboard/ctf");
  }

  const challenges = (Array.isArray(competition.ctf_challenges) ? competition.ctf_challenges : [])
    .filter((c: any) => c.is_visible)
    .sort((a: any, b: any) => a.base_points - b.base_points); // easy first

  // Which challenges has this user already solved?
  const { data: mySolves } = await supabase
    .from("ctf_solves")
    .select("challenge_id, points_awarded, solve_position")
    .eq("competition_id", params.id)
    .eq("researcher_id", user.id)
    .gt("solve_position", 0);

  const solvedSet = new Set((mySolves ?? []).map((s) => s.challenge_id));
  const myPoints  = (mySolves ?? []).reduce((sum, s) => sum + s.points_awarded, 0);

  // Which hints has this user revealed?
  const { data: hintReveals } = await supabase
    .from("ctf_hint_reveals")
    .select("challenge_id")
    .eq("researcher_id", user.id);
  const revealedHints = new Set((hintReveals ?? []).map((h) => h.challenge_id));

  // Live scoreboard
  const { data: scoreboard } = await supabase
    .from("ctf_scoreboard")
    .select("*")
    .eq("competition_id", params.id)
    .limit(20);

  // Group challenges by category
  const byCategory = challenges.reduce((acc: Record<string, any[]>, ch: any) => {
    (acc[ch.category] ??= []).push(ch);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/ctf" className="text-vault-muted hover:text-vault-text transition-colors mt-1">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Flag className="w-4 h-4 text-vault-teal" /> {competition.title}
            </h1>
            <p className="text-sm text-vault-muted mt-1">{competition.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {mySolves && mySolves.length > 0 && (
            <div className="text-right">
              <p className="text-lg font-semibold text-vault-teal">{myPoints} pts</p>
              <p className="text-xs text-vault-muted">{mySolves.length} solve{mySolves.length !== 1 ? "s" : ""}</p>
            </div>
          )}
          {!hasEnded && (
            <CountdownTimer endsAt={competition.ends_at} startsAt={competition.starts_at} />
          )}
        </div>
      </div>

      {/* Not started yet */}
      {!hasStarted && (
        <div className="vault-card p-8 text-center">
          <Clock className="w-8 h-8 text-vault-teal mx-auto mb-3" />
          <p className="font-medium mb-1">Competition starts {formatDate(competition.starts_at)}</p>
          <p className="text-sm text-vault-muted">Challenges will be revealed when the competition begins.</p>
        </div>
      )}

      {/* Ended banner */}
      {hasEnded && (
        <div className="vault-card p-4 border-vault-teal/20">
          <p className="text-sm text-vault-teal font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Competition ended — final standings below
          </p>
        </div>
      )}

      {/* Active competition: challenges + scoreboard */}
      {(hasStarted) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Challenges */}
          <div className="lg:col-span-2 space-y-5">
            {Object.entries(byCategory).map(([category, cats]) => {
              const typedCats = cats as any[];
              return (
                <div key={category}>
                  <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${CAT_COLORS[category] ?? "text-vault-muted"}`}>
                    {category.replace("_", " ")}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {typedCats.map((ch: any) => {
                      const solved     = solvedSet.has(ch.id);
                      const hintShown  = revealedHints.has(ch.id);
                      const mySolve    = (mySolves ?? []).find((s: any) => s.challenge_id === ch.id);
                      const diff       = DIFF_CFG[ch.difficulty as keyof typeof DIFF_CFG] ?? DIFF_CFG.medium;

                      return (
                        <FlagSubmitter
                        key={ch.id}
                        challenge={{
                          id:            ch.id,
                          competitionId: params.id,
                          title:         ch.title,
                          description:   ch.description,
                          category:      ch.category,
                          difficulty:    ch.difficulty,
                          basePoints:    ch.base_points,
                          minPoints:     ch.min_points,
                          solveCount:    ch.solve_count,
                          hint:          hintShown ? ch.hint : null,
                          hintCost:      ch.hint_cost,
                          hasHint:       !!ch.hint,
                          attachmentUrl: ch.attachment_url,
                        }}
                        solved={solved}
                        solvePoints={mySolve?.points_awarded ?? null}
                        solvePosition={mySolve?.solve_position ?? null}
                        hintAlreadyRevealed={hintShown}
                        isActive={isLive}
                        diffConfig={diff}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

            {challenges.length === 0 && hasStarted && (
              <div className="vault-card p-8 text-center">
                <Flag className="w-7 h-7 text-vault-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm text-vault-muted">No challenges yet</p>
              </div>
            )}
          </div>

          {/* Live scoreboard */}
          <div>
            <LiveScoreboard
              entries={scoreboard ?? []}
              currentUserId={user.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}

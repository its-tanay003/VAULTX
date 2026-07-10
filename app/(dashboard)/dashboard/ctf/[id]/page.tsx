import { createClient }      from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link                   from "next/link";
import {
  ChevronLeft, Flag, Plus, Trophy, Users, Lock, Globe,
  Trash2, Calendar, AlertTriangle,
} from "lucide-react";
import { CompetitionStatusControl } from "@/components/ctf/competition-status-control";
import { formatDate }               from "@/lib/utils";
import type { Metadata }            from "next";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const supabase = createClient();
  const { data } = await supabase.from("ctf_competitions").select("title").eq("id", params.id).single();
  return { title: data?.title ?? "CTF" };
}

const DIFF_CFG = {
  easy:   { cls: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50", label: "Easy"   },
  medium: { cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50",   label: "Medium" },
  hard:   { cls: "text-orange-400 bg-orange-950/50 border-orange-900/50",   label: "Hard"   },
  insane: { cls: "text-red-400 bg-red-950/50 border-red-900/50",             label: "Insane" },
};

export default async function CTFManagePage(props: Props) {
  const params = await props.params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: competition } = await supabase
    .from("ctf_competitions")
    .select("*, organizations(name, owner_id), ctf_challenges(*)")
    .eq("id", params.id)
    .single();

  if (!competition) notFound();

  const org = Array.isArray(competition.organizations) ? competition.organizations[0] : competition.organizations;
  if (org?.owner_id !== user.id) notFound();

  const challenges = Array.isArray(competition.ctf_challenges) ? competition.ctf_challenges : [];

  // Scoreboard summary
  const { data: solves } = await supabase
    .from("ctf_solves")
    .select("researcher_id, points_awarded")
    .eq("competition_id", params.id)
    .gt("solve_position", 0); // exclude hint penalties

  const uniqueParticipants = new Set((solves ?? []).map((s) => s.researcher_id)).size;
  const totalSolves = (solves ?? []).length;

  const now = new Date();
  const isLive = competition.status === "active"
    && new Date(competition.starts_at) <= now
    && new Date(competition.ends_at) >= now;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in">
      <div className="flex items-start gap-3">
        <Link href="/dashboard/ctf" className="text-vault-muted hover:text-vault-text transition-colors mt-1">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Flag className="w-4 h-4 text-vault-teal" /> {competition.title}
          </h1>
          <p className="text-sm text-vault-muted mt-1 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(competition.starts_at)} – {formatDate(competition.ends_at)}
            </span>
            <span className="flex items-center gap-1">
              {competition.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {competition.is_public ? "Public" : "Private"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isLive && (
            <Link href={`/dashboard/ctf/${params.id}/play`} className="btn-ghost text-sm">
              Preview →
            </Link>
          )}
          <CompetitionStatusControl competitionId={params.id} currentStatus={competition.status} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={<Flag className="w-4 h-4 text-vault-teal" />}    label="Challenges"   value={challenges.length} />
        <MiniStat icon={<Users className="w-4 h-4 text-vault-teal" />}   label="Participants" value={uniqueParticipants} />
        <MiniStat icon={<Trophy className="w-4 h-4 text-vault-teal" />}  label="Solves"        value={totalSolves} />
      </div>

      {/* Challenge list */}
      <div className="vault-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Challenges ({challenges.length})</h2>
          {competition.status === "draft" && (
            <Link href={`/dashboard/ctf/${params.id}/challenges/new`} className="btn-ghost text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Challenge
            </Link>
          )}
          {competition.status !== "draft" && (
            <p className="text-[11px] text-vault-muted">Challenge list locked while competition is active</p>
          )}
        </div>

        {challenges.length === 0 ? (
          <div className="text-center py-8">
            <Flag className="w-7 h-7 text-vault-muted mx-auto mb-2 opacity-50" />
            <p className="text-sm text-vault-muted">No challenges yet</p>
            {competition.status === "draft" && (
              <Link href={`/dashboard/ctf/${params.id}/challenges/new`} className="btn-teal mt-3 inline-flex text-sm">
                Add first challenge
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-vault-border">
            {challenges.map((ch: any) => {
              const diff = DIFF_CFG[ch.difficulty as keyof typeof DIFF_CFG] ?? DIFF_CFG.medium;
              return (
                <div key={ch.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-medium">{ch.title}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${diff.cls}`}>
                        {diff.label}
                      </span>
                      <span className="text-[10px] text-vault-muted border border-vault-border rounded px-1.5 py-0.5 capitalize">
                        {ch.category}
                      </span>
                    </div>
                    <p className="text-xs text-vault-muted">
                      {ch.base_points} → {ch.min_points} pts · {ch.solve_count} solve{ch.solve_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {ch.hint && (
                    <span className="text-[10px] text-vault-muted border border-vault-border rounded px-1.5 py-0.5">
                      Hint (-{ch.hint_cost} pts)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pre-launch warning */}
      {competition.status === "draft" && challenges.length === 0 && (
        <div className="vault-card p-4 border-yellow-900/50">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-vault-muted">
              Add at least one challenge before activating this competition. Challenges cannot be added or deleted while the competition is active.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="vault-card p-3.5 text-center">
      <div className="w-8 h-8 rounded-lg bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center mx-auto mb-2">
        {icon}
      </div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-vault-muted">{label}</p>
    </div>
  );
}

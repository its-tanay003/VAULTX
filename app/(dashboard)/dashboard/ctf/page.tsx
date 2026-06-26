import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import Link               from "next/link";
import {
  Flag, Plus, Calendar, Lock, Globe, ChevronRight, Clock,
} from "lucide-react";
import { EmptyState }    from "@/components/ui/empty-state";
import { formatDate }    from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CTF Competitions" };

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  draft:    { label: "Draft",    cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"                },
  active:   { label: "Live",     cls: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50"       },
  ended:    { label: "Ended",    cls: "text-vault-muted bg-vault-elevated border-vault-border"          },
  archived: { label: "Archived", cls: "text-zinc-500 bg-zinc-900/50 border-zinc-800/50"                },
};

export default async function CTFPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();

  const isOrg = profile?.role === "org" && profile.org_id;

  let query = supabase
    .from("ctf_competitions")
    .select(`id, title, description, status, starts_at, ends_at, is_public,
      ctf_challenges(id)`)
    .order("starts_at", { ascending: false });

  query = isOrg
    ? query.eq("org_id", profile.org_id)
    : query.eq("is_public", true).in("status", ["active", "ended"]);

  const { data: competitions } = await query;
  const items = competitions ?? [];
  const now = new Date();

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Flag className="w-5 h-5 text-vault-teal" /> CTF Competitions
          </h1>
          <p className="text-sm text-vault-muted mt-0.5">
            {isOrg ? "Manage your CTF competitions and challenges" : "Browse and compete in public CTF events"}
          </p>
        </div>
        {isOrg && (
          <Link href="/dashboard/ctf/new" className="btn-teal flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Competition
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Flag className="w-6 h-6" />}
          title={isOrg ? "No competitions yet" : "No public competitions available"}
          description={isOrg
            ? "Create a CTF competition, add challenges, and invite researchers to compete."
            : "Public CTF competitions will appear here when they're live."}
          action={isOrg ? { href: "/dashboard/ctf/new", label: "Create competition" } : undefined}
        />
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {items.map((comp) => {
            const cfg          = STATUS_CFG[comp.status] ?? STATUS_CFG.draft;
            const isLive       = comp.status === "active" && new Date(comp.starts_at) <= now && new Date(comp.ends_at) >= now;
            const challengeCount = Array.isArray(comp.ctf_challenges) ? comp.ctf_challenges.length : 0;

            return (
              <Link
                key={comp.id}
                href={isOrg ? `/dashboard/ctf/${comp.id}` : `/dashboard/ctf/${comp.id}/play`}
                className="flex items-center gap-4 p-4 hover:bg-vault-elevated/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0 relative">
                  <Flag className="w-4 h-4 text-vault-teal" />
                  {isLive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-vault-bg animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                    {comp.title}
                  </p>
                  <p className="text-xs text-vault-muted mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(comp.starts_at)} – {formatDate(comp.ends_at)}
                    </span>
                    <span>{challengeCount} challenge{challengeCount !== 1 ? "s" : ""}</span>
                    <span className="flex items-center gap-1">
                      {comp.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {comp.is_public ? "Public" : "Private"}
                    </span>
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${cfg.cls}`}>
                  {isLive ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Live
                    </span>
                  ) : cfg.label}
                </span>
                <ChevronRight className="w-4 h-4 text-vault-muted shrink-0 group-hover:text-vault-teal transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

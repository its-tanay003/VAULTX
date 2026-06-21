import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import Link               from "next/link";
import {
  Shield, Plus, Calendar, User, ChevronRight, Bug,
} from "lucide-react";
import { EmptyState }    from "@/components/ui/empty-state";
import { formatDate }    from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "PTaaS" };

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  scheduled:   { label: "Scheduled",   cls: "text-sky-400 bg-sky-950/50 border-sky-900/50"        },
  in_progress: { label: "In Progress", cls: "text-violet-400 bg-violet-950/50 border-violet-900/50" },
  completed:   { label: "Completed",   cls: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50" },
  cancelled:   { label: "Cancelled",   cls: "text-zinc-500 bg-zinc-800/50 border-zinc-700/50"      },
};

/**
 * Replaces the Week 8 waitlist stub. PTaaS is now a real module —
 * org owners create and manage engagements; researchers assigned as
 * pentesters see their assigned engagements here too.
 */
export default async function PTaaSPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();

  const isOrg = profile?.role === "org" && profile.org_id;

  let query = supabase
    .from("pentest_engagements")
    .select(`
      id, name, status, start_date, end_date,
      profiles!pentest_engagements_assigned_pentester_id_fkey(full_name, username),
      pentest_findings(id)
    `)
    .order("created_at", { ascending: false });

  query = isOrg
    ? query.eq("org_id", profile.org_id)
    : query.eq("assigned_pentester_id", user.id);

  const { data: engagements } = await query;
  const items = engagements ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-vault-teal" /> PTaaS
          </h1>
          <p className="text-sm text-vault-muted mt-0.5">
            {isOrg ? "Scoped penetration testing engagements" : "Your assigned engagements"}
          </p>
        </div>
        {isOrg && (
          <Link href="/dashboard/ptaas/new" className="btn-teal flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Engagement
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-6 h-6" />}
          title={isOrg ? "No engagements yet" : "No engagements assigned to you yet"}
          description={isOrg
            ? "Create a scoped, time-boxed pentest engagement and assign a researcher to run it."
            : "When an organization assigns you to a pentest engagement, it'll show up here."}
          action={isOrg ? { href: "/dashboard/ptaas/new", label: "Create engagement" } : undefined}
        />
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {items.map((eng) => {
            const cfg = STATUS_CFG[eng.status] ?? STATUS_CFG.scheduled;
            const pentester = Array.isArray(eng.profiles) ? eng.profiles[0] : eng.profiles;
            const findingCount = Array.isArray(eng.pentest_findings) ? eng.pentest_findings.length : 0;

            return (
              <Link
                key={eng.id}
                href={`/dashboard/ptaas/${eng.id}`}
                className="flex items-center gap-4 p-4 hover:bg-vault-elevated/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-vault-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-vault-teal transition-colors">
                    {eng.name}
                  </p>
                  <p className="text-xs text-vault-muted mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(eng.start_date)} – {formatDate(eng.end_date)}
                    </span>
                    {isOrg && pentester && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {pentester.full_name ?? pentester.username}
                      </span>
                    )}
                    {findingCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Bug className="w-3 h-3" /> {findingCount} finding{findingCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${cfg.cls}`}>
                  {cfg.label}
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

import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import { ReportBuilder } from "@/components/reports/report-builder";
import { listReportTemplates } from "@/app/actions/reports";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  const orgId = org?.id ?? profile?.org_id;
  if (!orgId) redirect("/dashboard/org");

  const { data: programs } = await supabase.from("programs").select("id, name").eq("org_id", orgId);

  const { data: submissionResearchers } = await supabase
    .from("submissions")
    .select("researcher_id, profiles!submissions_researcher_id_fkey(id, full_name, username), programs!inner(org_id)")
    .eq("programs.org_id", orgId);

  const researcherMap = new Map<string, { id: string; full_name: string | null; username: string | null }>();
  for (const s of submissionResearchers ?? []) {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    if (p) researcherMap.set(p.id, p);
  }

  const templates = await listReportTemplates();

  return (
    <div className="space-y-5 animate-in">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-vault-muted mt-0.5">
          Build custom reports across submissions, payouts, and researcher activity
        </p>
      </div>
      <ReportBuilder
        programs={programs ?? []}
        researchers={Array.from(researcherMap.values())}
        initialTemplates={templates as any}
      />
    </div>
  );
}

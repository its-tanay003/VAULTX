import { createClient } from "@/lib/supabase/server";
import { generatePentestReportPdf } from "@/lib/pdf/pentest-report";

/**
 * Core PTaaS report generation, extracted from the download route so
 * VAULT's Agent Mode "generate report" action calls this exact same
 * function rather than a separate implementation — matching Agent
 * Mode's core design rule (see docs/vault-agent-mode-design.md §2.1):
 * VAULT never gets its own privileged code path.
 */
export async function generateEngagementReportPdf(engagementId: string): Promise<{
  bytes: Uint8Array; sha256: string; filename: string; engagementName: string;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: engagement } = await supabase
    .from("pentest_engagements")
    .select(`
      id, name, scope_description, start_date, end_date,
      assigned_pentester_id,
      organizations ( name, owner_id )
    `)
    .eq("id", engagementId)
    .single();

  if (!engagement) throw new Error("Engagement not found");

  const org = engagement.organizations as unknown as { name: string; owner_id: string } | null;
  const isOrgOwner  = org?.owner_id === user.id;
  const isPentester = engagement.assigned_pentester_id === user.id;
  if (!isOrgOwner && !isPentester) {
    throw new Error("Not authorized to access this engagement's report");
  }

  const { data: report } = await supabase
    .from("pentest_reports")
    .select("id, executive_summary, full_report")
    .eq("engagement_id", engagementId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (!report) throw new Error("No report has been generated for this engagement yet");

  const { data: findings } = await supabase
    .from("pentest_findings")
    .select("title, severity, status, description")
    .eq("engagement_id", engagementId)
    .order("severity", { ascending: true });

  const fullReport = report.full_report as {
    sections: { title: string; content: string }[];
    findings_summary: Record<string, number>;
    recommendations: string[];
  };

  const { bytes, sha256 } = await generatePentestReportPdf({
    engagementName:   engagement.name,
    orgName:          org?.name ?? "Unknown Organization",
    scopeDescription: engagement.scope_description,
    startDate:        engagement.start_date,
    endDate:          engagement.end_date,
    executiveSummary: report.executive_summary,
    sections:         fullReport.sections ?? [],
    findingsSummary:  fullReport.findings_summary ?? {},
    recommendations:  fullReport.recommendations ?? [],
    findings:         findings ?? [],
    reportId:         report.id,
  });

  await supabase
    .from("pentest_reports")
    .update({ pdf_sha256: sha256, pdf_generated_at: new Date().toISOString() })
    .eq("id", report.id);

  const filename = `${engagement.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report.pdf`;
  return { bytes, sha256, filename, engagementName: engagement.name };
}

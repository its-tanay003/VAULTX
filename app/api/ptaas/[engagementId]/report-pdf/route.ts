import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePentestReportPdf } from "@/lib/pdf/pentest-report";

/**
 * GET /api/ptaas/[engagementId]/report-pdf
 *
 * Generates the native signed PDF for an engagement's latest report
 * on demand (not pre-rendered/cached) so it always reflects the
 * current report content. Access is scoped to the engagement's org
 * owner or its assigned pentester — the same two roles that can view
 * the engagement page itself.
 */
export async function GET(_request: Request, { params }: { params: { engagementId: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: engagement } = await supabase
      .from("pentest_engagements")
      .select(`
        id, name, scope_description, start_date, end_date,
        assigned_pentester_id,
        organizations ( name, owner_id )
      `)
      .eq("id", params.engagementId)
      .single();

    if (!engagement) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
    }

    const org = engagement.organizations as unknown as { name: string; owner_id: string } | null;
    const isOrgOwner   = org?.owner_id === user.id;
    const isPentester  = engagement.assigned_pentester_id === user.id;
    if (!isOrgOwner && !isPentester) {
      return NextResponse.json({ error: "Not authorized to access this engagement's report" }, { status: 403 });
    }

    const { data: report } = await supabase
      .from("pentest_reports")
      .select("id, executive_summary, full_report")
      .eq("engagement_id", params.engagementId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (!report) {
      return NextResponse.json({ error: "No report has been generated for this engagement yet" }, { status: 404 });
    }

    const { data: findings } = await supabase
      .from("pentest_findings")
      .select("title, severity, status, description")
      .eq("engagement_id", params.engagementId)
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

    // Record the export's integrity hash so it can be verified later
    // (e.g. a recipient re-hashes a received file and compares).
    await supabase
      .from("pentest_reports")
      .update({ pdf_sha256: sha256, pdf_generated_at: new Date().toISOString() })
      .eq("id", report.id);

    const filename = `${engagement.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report.pdf`;

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Report-SHA256":     sha256,
      },
    });
  } catch (err: unknown) {
    console.error("[PTaaS PDF Export] Failed:", err);
    return NextResponse.json({ error: "Failed to generate PDF report" }, { status: 500 });
  }
}

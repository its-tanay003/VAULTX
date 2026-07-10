import { NextResponse } from "next/server";
import { generateEngagementReportPdf } from "@/lib/ptaas/report-generation";

/**
 * GET /api/ptaas/[engagementId]/report-pdf
 *
 * Thin wrapper around lib/ptaas/report-generation.ts — the actual
 * generation, auth check, and hash storage all live there so this
 * route and VAULT's Agent Mode "generate report" action call the
 * identical function, not parallel implementations.
 */
export async function GET(_request: Request, props: { params: Promise<{ engagementId: string }> }) {
  const params = await props.params;
  try {
    const { bytes, sha256, filename } = await generateEngagementReportPdf(params.engagementId);

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
    const message = err instanceof Error ? err.message : "Failed to generate PDF report";
    const status = message.includes("not authenticated") ? 401
      : message.includes("Not authorized") ? 403
      : message.includes("not found") ? 404
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

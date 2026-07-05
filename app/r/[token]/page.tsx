import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getEmbeddedReport } from "@/app/actions/reports";
import { EmbedChart } from "@/components/reports/embed-chart";

/**
 * GET /r/[token]
 *
 * Public, unauthenticated. Deliberately outside the (dashboard) route
 * group — no auth check, no sidebar, no session. Only ever returns
 * data for templates with is_embeddable=true, and only the four
 * metrics that don't identify individual researchers (bugs_submitted,
 * bugs_resolved, severity_distribution, payout_totals) — leaderboard
 * and researcher_activity are excluded from embeds even if the
 * template that generated them includes those metrics, since a
 * client-facing public link shouldn't expose which named researcher
 * found what, or their individual earnings.
 */
export default async function EmbedReportPage({ params }: { params: { token: string } }) {
  const report = await getEmbeddedReport(params.token);
  if (!report) notFound();

  return (
    <div className="min-h-screen bg-vault-bg text-vault-text">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 text-xs text-vault-muted mb-8">
          <ShieldCheck className="w-3.5 h-3.5 text-vault-teal" /> Shared via VAULTX
        </div>
        <h1 className="text-2xl font-semibold mb-1">{report.name}</h1>
        <p className="text-sm text-vault-muted mb-8">Read-only shared report</p>

        <div className="space-y-6">
          {Object.entries(report.results).map(([key, value]) => (
            <EmbedChart key={key} metricKey={key} data={value as { label: string; value: number }[]} chartType={report.config.chartType} />
          ))}
        </div>
      </div>
    </div>
  );
}

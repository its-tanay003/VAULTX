import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  metricBugsSubmitted, metricBugsResolved, metricSeverityDistribution, metricPayoutTotals,
  type ReportFilters,
} from "@/lib/reports/metrics";
import type { ReportConfig, MetricKey } from "@/app/actions/reports";

/**
 * GET /api/cron/scheduled-reports
 *
 * Triggered by .github/workflows/scheduled-reports-cron.yml, same
 * pattern as the existing red-team-cron.yml (x-vault-secret header
 * auth, GitHub Actions schedule trigger — no new infrastructure
 * pattern introduced).
 *
 * Runs weekly reports every Monday and monthly reports on the 1st,
 * computing each due template's metrics directly (via the admin
 * client, since a cron job has no user session) and emailing every
 * recipient a plain summary. This intentionally does not render the
 * same recharts visuals as the dashboard — a text/list summary in an
 * email is more reliable across email clients than embedding SVG
 * charts, and avoids a server-side chart-rendering dependency for a
 * batch job that runs at most twice a month.
 */
export async function GET(request: Request) {
  const secret = request.headers.get("x-vault-secret");
  if (secret !== process.env.VAULT_INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const isMonday = now.getUTCDay() === 1;
  const isFirstOfMonth = now.getUTCDate() === 1;

  const dueFrequencies: string[] = [];
  if (isMonday) dueFrequencies.push("weekly");
  if (isFirstOfMonth) dueFrequencies.push("monthly");

  if (dueFrequencies.length === 0) {
    return NextResponse.json({ message: "No scheduled reports due today" });
  }

  const { data: scheduled } = await supabase
    .from("scheduled_reports")
    .select("id, template_id, frequency, recipient_emails, report_templates(id, name, config, org_id)")
    .in("frequency", dueFrequencies);

  let sent = 0;
  const errors: string[] = [];

  for (const schedule of scheduled ?? []) {
    const template = Array.isArray(schedule.report_templates) ? schedule.report_templates[0] : schedule.report_templates;
    if (!template || !schedule.recipient_emails?.length) continue;

    try {
      const config = template.config as ReportConfig;
      const filters: ReportFilters = { orgId: template.org_id, ...config.filters };
      const lines: string[] = [];

      for (const metric of config.metrics as MetricKey[]) {
        switch (metric) {
          case "bugs_submitted": {
            const data = await metricBugsSubmitted(filters);
            lines.push(`Bugs Submitted: ${data.reduce((s, d) => s + d.value, 0)} total`);
            break;
          }
          case "bugs_resolved": {
            const data = await metricBugsResolved(filters);
            lines.push(`Bugs Resolved: ${data.reduce((s, d) => s + d.value, 0)} total`);
            break;
          }
          case "severity_distribution": {
            const data = await metricSeverityDistribution(filters);
            lines.push(`Severity: ${data.map((d) => `${d.label}=${d.value}`).join(", ")}`);
            break;
          }
          case "payout_totals": {
            const data = await metricPayoutTotals(filters);
            lines.push(`Payouts: ${data.reduce((s, d) => s + d.value, 0)} total`);
            break;
          }
          default:
            lines.push(`${metric}: view full report in the VAULTX dashboard`);
        }
      }

      const html = `
        <div style="font-family:sans-serif;max-width:500px;">
          <h2 style="color:#0a0a0a;">${template.name}</h2>
          <p style="color:#71717a;font-size:13px;">${schedule.frequency === "weekly" ? "Weekly" : "Monthly"} scheduled report from VAULTX</p>
          <ul style="color:#18181b;font-size:14px;line-height:1.6;">
            ${lines.map((l) => `<li>${l}</li>`).join("")}
          </ul>
          <p style="font-size:12px;color:#71717a;">
            View the full interactive report at
            ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/org/reports
          </p>
        </div>
      `;

      for (const email of schedule.recipient_emails) {
        await sendEmail({ to: email, subject: `[VAULTX] ${template.name} — ${schedule.frequency} report`, html });
      }

      await supabase.from("scheduled_reports").update({ last_sent_at: new Date().toISOString() }).eq("id", schedule.id);
      sent++;
    } catch (err: unknown) {
      errors.push(`${schedule.id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ sent, errors });
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import {
  metricBugsSubmitted, metricBugsResolved, metricSeverityDistribution,
  metricPayoutTotals, metricAvgResponseTime, metricResearcherActivity,
  metricResearcherLeaderboard, metricProgramRoi, metricSlaCompliance,
  type ReportFilters,
} from "@/lib/reports/metrics";
import { detectAnomalies } from "@/lib/reports/anomaly";

export type MetricKey =
  | "bugs_submitted" | "bugs_resolved" | "severity_distribution" | "payout_totals"
  | "avg_response_time" | "researcher_activity" | "researcher_leaderboard"
  | "program_roi" | "sla_compliance";

export interface ReportConfig {
  metrics:        MetricKey[];
  chartType:      "bar" | "line" | "pie" | "scatter";
  filters:        Omit<ReportFilters, "orgId">;
  comparisonMode: boolean;
  comparisonDateFrom?: string;
  comparisonDateTo?:   string;
}

async function getOrgId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (org) return org.id;

  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile?.org_id) throw new Error("No organization found for this account");
  return profile.org_id;
}

/** Computes every metric requested in a config. Shared by the live builder and (Batch 2) the scheduled-report cron. */
export async function computeReport(config: ReportConfig, filtersOverride?: Omit<ReportFilters, "orgId">) {
  const orgId = await getOrgId();
  const filters: ReportFilters = { orgId, ...(filtersOverride ?? config.filters) };

  const results: Record<string, unknown> = {};

  for (const metric of config.metrics) {
    switch (metric) {
      case "bugs_submitted":         results[metric] = await metricBugsSubmitted(filters); break;
      case "bugs_resolved":          results[metric] = await metricBugsResolved(filters); break;
      case "severity_distribution":  results[metric] = await metricSeverityDistribution(filters); break;
      case "payout_totals":          results[metric] = await metricPayoutTotals(filters); break;
      case "avg_response_time":      results[metric] = await metricAvgResponseTime(filters); break;
      case "researcher_activity":    results[metric] = await metricResearcherActivity(filters); break;
      case "researcher_leaderboard": results[metric] = await metricResearcherLeaderboard(filters); break;
      case "program_roi":            results[metric] = await metricProgramRoi(filters); break;
      case "sla_compliance":         results[metric] = await metricSlaCompliance(filters); break;
    }
  }

  const anomalies: Record<string, ReturnType<typeof detectAnomalies>> = {};
  for (const [key, value] of Object.entries(results)) {
    if (Array.isArray(value) && value.length && "label" in value[0] && "value" in value[0]) {
      anomalies[key] = detectAnomalies(value as { label: string; value: number }[]);
    }
  }

  let comparison: Record<string, unknown> | null = null;
  if (config.comparisonMode && config.comparisonDateFrom && config.comparisonDateTo) {
    comparison = {};
    const compFilters: ReportFilters = { ...filters, dateFrom: config.comparisonDateFrom, dateTo: config.comparisonDateTo };
    for (const metric of config.metrics) {
      switch (metric) {
        case "bugs_submitted":  comparison[metric] = await metricBugsSubmitted(compFilters); break;
        case "bugs_resolved":   comparison[metric] = await metricBugsResolved(compFilters); break;
        case "payout_totals":   comparison[metric] = await metricPayoutTotals(compFilters); break;
        default: break; // comparison mode is most meaningful for time-series metrics
      }
    }
  }

  return { results, anomalies, comparison };
}

/* ─── Saved templates ────────────────────────────────────────────────────────── */
export async function saveReportTemplate(name: string, config: ReportConfig): Promise<{ id: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const orgId = await getOrgId();

  const { data, error } = await supabase
    .from("report_templates")
    .insert({ org_id: orgId, created_by: user.id, name, config })
    .select("id").single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/org/reports");
  return { id: data.id };
}

export async function listReportTemplates() {
  const supabase = createClient();
  const orgId = await getOrgId();
  const { data } = await supabase
    .from("report_templates").select("id, name, config, is_embeddable, embed_token, created_at")
    .eq("org_id", orgId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function deleteReportTemplate(id: string): Promise<void> {
  const supabase = createClient();
  const orgId = await getOrgId();
  const { error } = await supabase.from("report_templates").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/org/reports");
}

/** Toggles public embed access for a template, minting a new opaque token on first enable. */
export async function toggleReportEmbed(id: string, enable: boolean): Promise<{ embedToken: string | null }> {
  const supabase = createClient();
  const orgId = await getOrgId();

  const { data: existing } = await supabase.from("report_templates").select("embed_token").eq("id", id).eq("org_id", orgId).single();
  const embedToken = enable ? (existing?.embed_token ?? crypto.randomBytes(16).toString("hex")) : existing?.embed_token ?? null;

  const { error } = await supabase
    .from("report_templates")
    .update({ is_embeddable: enable, embed_token: enable ? embedToken : existing?.embed_token })
    .eq("id", id).eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/org/reports");
  return { embedToken: enable ? embedToken : null };
}

/** Public, unauthenticated read for the embed route — uses the admin client since an anonymous visitor has no auth.uid(). */
export async function getEmbeddedReport(token: string) {
  const supabase = createAdminClient();
  const { data: template } = await supabase
    .from("report_templates").select("id, name, config, org_id, is_embeddable").eq("embed_token", token).single();

  if (!template || !template.is_embeddable) return null;

  const config = template.config as ReportConfig;
  const filters: ReportFilters = { orgId: template.org_id, ...config.filters };
  const results: Record<string, unknown> = {};

  for (const metric of config.metrics) {
    switch (metric) {
      case "bugs_submitted":        results[metric] = await metricBugsSubmitted(filters); break;
      case "bugs_resolved":         results[metric] = await metricBugsResolved(filters); break;
      case "severity_distribution": results[metric] = await metricSeverityDistribution(filters); break;
      case "payout_totals":         results[metric] = await metricPayoutTotals(filters); break;
      default: break; // embed views deliberately omit researcher-identifying metrics (leaderboard, activity) — see README note
    }
  }

  return { name: template.name, config, results };
}

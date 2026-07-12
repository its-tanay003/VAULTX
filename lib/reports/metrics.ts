/**
 * VAULTX Reporting Metrics Engine
 *
 * SERVER-ONLY. Every metric the reporting builder can show is computed
 * here from a shared ReportFilters shape, so the builder UI and the
 * scheduled-report cron (Batch 2) can both call the exact same
 * function and get identical numbers.
 *
 * Honest scope note on "program ROI": there's no real revenue/value
 * figure anywhere in this schema to compute true ROI against. What's
 * implemented is total payout ÷ number of accepted (valid) findings —
 * a cost-per-valid-finding proxy, not "return on investment" in the
 * financial sense. Labeled as such in the UI rather than overclaiming.
 */

import { createClient } from "@/lib/supabase/server";

export interface ReportFilters {
  orgId:        string;
  dateFrom?:    string;
  dateTo?:      string;
  severities?:  string[];
  statuses?:    string[];
  researcherId?: string;
  programId?:   string;
}

// Pass dynamic client so unauthenticated embeds / cron can feed createAdminClient()
async function baseSubmissionsQuery(supabase: any, f: ReportFilters) {
  let q = supabase
    .from("submissions")
    .select("id, severity, status, created_at, updated_at, researcher_id, program_id, programs!inner(org_id, name)")
    .eq("programs.org_id", f.orgId);

  if (f.dateFrom) q = q.gte("created_at", f.dateFrom);
  if (f.dateTo)   q = q.lte("created_at", f.dateTo);
  if (f.severities?.length) q = q.in("severity", f.severities);
  if (f.statuses?.length)   q = q.in("status", f.statuses);
  if (f.researcherId)       q = q.eq("researcher_id", f.researcherId);
  if (f.programId)          q = q.eq("program_id", f.programId);

  return q;
}

export async function metricBugsSubmitted(f: ReportFilters, client?: any): Promise<{ label: string; value: number }[]> {
  const supabase = client || createClient();
  const { data } = await baseSubmissionsQuery(supabase, f);
  const byDay = new Map<string, number>();
  for (const s of data ?? []) {
    const day = s.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
}

export async function metricBugsResolved(f: ReportFilters, client?: any): Promise<{ label: string; value: number }[]> {
  const supabase = client || createClient();
  const { data } = await baseSubmissionsQuery(supabase, f);
  const resolved = (data ?? []).filter((s: any) => ["accepted", "resolved"].includes(s.status));
  const byDay = new Map<string, number>();
  for (const s of resolved) {
    const day = (s as any).updated_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
}

export async function metricSeverityDistribution(f: ReportFilters, client?: any): Promise<{ label: string; value: number }[]> {
  const supabase = client || createClient();
  const { data } = await baseSubmissionsQuery(supabase, f);
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const s of data ?? []) counts[s.severity] = (counts[s.severity] ?? 0) + 1;
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

export async function metricPayoutTotals(f: ReportFilters, client?: any): Promise<{ label: string; value: number }[]> {
  const supabase = client || createClient();
  let q = supabase.from("rewards").select("amount, currency, paid_at, status").eq("org_id", f.orgId).eq("status", "paid");
  if (f.dateFrom) q = q.gte("paid_at", f.dateFrom);
  if (f.dateTo)   q = q.lte("paid_at", f.dateTo);
  const { data } = await q;

  const byMonth = new Map<string, number>();
  for (const r of data ?? []) {
    if (!r.paid_at) continue;
    const month = r.paid_at.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + r.amount);
  }
  return Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
}

// Approximate: no dedicated "first triaged at" timestamp exists in the
// schema, so this uses updated_at - created_at for any submission that
// has left the 'new' status. Labeled as an approximation, not exact SLA
// timing.
export async function metricAvgResponseTime(f: ReportFilters, client?: any): Promise<{ label: string; value: number }> {
  const supabase = client || createClient();
  const { data } = await baseSubmissionsQuery(supabase, f);
  const triaged = (data ?? []).filter((s: any) => s.status !== "new");
  if (!triaged.length) return { label: "Avg Response Time (hrs, approx.)", value: 0 };

  const totalHours = triaged.reduce((sum: number, s: any) => {
    const hours = (new Date(s.updated_at).getTime() - new Date(s.created_at).getTime()) / 36e5;
    return sum + hours;
  }, 0);

  return { label: "Avg Response Time (hrs, approx.)", value: Math.round((totalHours / triaged.length) * 10) / 10 };
}

export async function metricResearcherActivity(f: ReportFilters, client?: any): Promise<{ label: string; value: number }[]> {
  const supabase = client || createClient();
  const { data } = await baseSubmissionsQuery(supabase, f);
  const byResearcher = new Map<string, number>();
  for (const s of data ?? []) byResearcher.set(s.researcher_id, (byResearcher.get(s.researcher_id) ?? 0) + 1);

  const researcherIds = Array.from(byResearcher.keys());
  if (!researcherIds.length) return [];

  const { data: profiles } = await supabase.from("profiles").select("id, full_name, username").in("id", researcherIds);
  const nameMap = new Map<string, string>((profiles ?? []).map((p: any) => [p.id as string, (p.full_name ?? p.username ?? "Unknown") as string]));

  return Array.from(byResearcher.entries())
    .map(([id, value]) => ({ label: (nameMap.get(id) ?? "Unknown") as string, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
}

export async function metricResearcherLeaderboard(f: ReportFilters, client?: any): Promise<
  { researcherId: string; name: string; bugsFound: number; totalPaid: number; qualityScore: number }[]
> {
  const supabase = client || createClient();
  const { data: subs } = await baseSubmissionsQuery(supabase, f);
  const { data: rewards } = await supabase.from("rewards").select("researcher_id, amount, status").eq("org_id", f.orgId).eq("status", "paid");

  const byResearcher = new Map<string, { bugsFound: number; totalPaid: number; accepted: number }>();
  for (const s of subs ?? []) {
    const entry = byResearcher.get(s.researcher_id) ?? { bugsFound: 0, totalPaid: 0, accepted: 0 };
    entry.bugsFound++;
    if (["accepted", "resolved"].includes(s.status)) entry.accepted++;
    byResearcher.set(s.researcher_id, entry);
  }
  for (const r of rewards ?? []) {
    const entry = byResearcher.get((r as any).researcher_id) ?? { bugsFound: 0, totalPaid: 0, accepted: 0 };
    entry.totalPaid += (r as any).amount;
    byResearcher.set((r as any).researcher_id, entry);
  }

  const researcherIds = Array.from(byResearcher.keys());
  if (!researcherIds.length) return [];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, username").in("id", researcherIds);
  const nameMap = new Map<string, string>((profiles ?? []).map((p: any) => [p.id as string, (p.full_name ?? p.username ?? "Unknown") as string]));

  return Array.from(byResearcher.entries())
    .map(([id, e]) => ({
      researcherId: id,
      name: (nameMap.get(id) ?? "Unknown") as string,
      bugsFound: e.bugsFound,
      totalPaid: e.totalPaid,
      // Quality score proxy: % of submissions accepted/resolved rather
      // than rejected/duplicate. Not a validated scoring model — a
      // simple, explainable ratio.
      qualityScore: e.bugsFound > 0 ? Math.round((e.accepted / e.bugsFound) * 100) : 0,
    }))
    .sort((a, b) => b.totalPaid - a.totalPaid);
}

export async function metricProgramRoi(f: ReportFilters, client?: any): Promise<{ label: string; value: number }[]> {
  const supabase = client || createClient();
  const { data: programs } = await supabase.from("programs").select("id, name").eq("org_id", f.orgId);
  const results: { label: string; value: number }[] = [];

  for (const program of programs ?? []) {
    const { data: subs } = await supabase.from("submissions").select("id, status").eq("program_id", program.id);
    const validCount = (subs ?? []).filter((s: any) => ["accepted", "resolved"].includes(s.status)).length;

    const { data: rewards } = await supabase
      .from("rewards").select("amount").eq("status", "paid")
      .in("submission_id", (subs ?? []).map((s: any) => s.id));
    const totalPaid = (rewards ?? []).reduce((sum: number, r: any) => sum + r.amount, 0);

    results.push({ label: program.name, value: validCount > 0 ? Math.round(totalPaid / validCount) : 0 });
  }
  return results;
}

/** Program-level SLA hours vs. actual approximate response time per submission. */
export async function metricSlaCompliance(f: ReportFilters, client?: any): Promise<
  { submissionId: string; title: string; program: string; slaHours: number; actualHours: number; breached: boolean }[]
> {
  const supabase = client || createClient();
  const { data } = await supabase
    .from("submissions")
    .select("id, title, status, created_at, updated_at, program_id, programs!inner(org_id, name, avg_response_hours)")
    .eq("programs.org_id", f.orgId)
    .neq("status", "new");

  return (data ?? []).map((s: any) => {
    const program = Array.isArray(s.programs) ? s.programs[0] : s.programs;
    const actualHours = Math.round(((new Date(s.updated_at).getTime() - new Date(s.created_at).getTime()) / 36e5) * 10) / 10;
    const slaHours = program?.avg_response_hours ?? 48;
    return { submissionId: s.id, title: s.title, program: program?.name ?? "", slaHours, actualHours, breached: actualHours > slaHours };
  });
}

// ─── Billing / SaaS Metrics ────────────────────────────────────────────────
// These use the subscriptions + invoices tables written by Batch 1/2.
// They share the identical (f, client?) signature so they slot into the
// reporting builder and scheduled-report cron with zero extra plumbing.

/**
 * Monthly Recurring Revenue (MRR) — per calendar month.
 *
 * Source: invoices where status = 'paid', grouped by period_start month.
 * Amount is the raw amount_cents stored by the webhook ÷ 100, expressed
 * in the organisation's default currency (assumed USD).  If you later
 * add multi-currency support, filter or convert here.
 *
 * Honest scope note: this is *revenue collected*, not an ARR-normalised
 * figure.  A yearly subscriber whose annual invoice lands in January
 * inflates that month by 12× — convert to monthly if you want true MRR.
 * Labelled "Revenue Collected (USD)" in the UI to avoid overclaiming.
 */
export async function metricMRR(f: ReportFilters, client?: any): Promise<{ label: string; value: number }[]> {
  const supabase = client || createClient();
  let q = supabase
    .from("invoices")
    .select("amount_cents, period_start")
    .eq("org_id", f.orgId)
    .eq("status", "paid");
  if (f.dateFrom) q = q.gte("period_start", f.dateFrom);
  if (f.dateTo)   q = q.lte("period_start", f.dateTo);
  const { data } = await q;

  const byMonth = new Map<string, number>();
  for (const inv of data ?? []) {
    if (!inv.period_start) continue;
    const month = (inv.period_start as string).slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + (inv.amount_cents as number) / 100);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));
}

/**
 * Churn Rate — percentage of subscriptions that moved to canceled/unpaid
 * per calendar month, relative to the total active at the start of the month.
 *
 * Approximation: we count rows in subscriptions where updated_at falls in
 * the month AND status is canceled/unpaid as churned, and the total count
 * of subscriptions created on or before the month start as the base.
 * Returns { label: "YYYY-MM", value: churn% } per month.
 */
export async function metricChurnRate(f: ReportFilters, client?: any): Promise<{ label: string; value: number }[]> {
  const supabase = client || createClient();
  // All subscriptions for this org — no date filter, we need full history
  const { data: allSubs } = await supabase
    .from("subscriptions")
    .select("status, created_at, updated_at")
    .eq("org_id", f.orgId);

  if (!allSubs?.length) return [];

  // Build a sorted list of months within the requested window
  const from = f.dateFrom ? f.dateFrom.slice(0, 7) : allSubs
    .map((s: any) => (s.created_at as string).slice(0, 7))
    .sort()[0];
  const to = f.dateTo ? f.dateTo.slice(0, 7) : new Date().toISOString().slice(0, 7);

  const months: string[] = [];
  let cur = from;
  while (cur <= to) {
    months.push(cur);
    const [y, m] = cur.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    cur = next;
  }

  return months.map((month) => {
    const monthEnd = `${month}-31`; // generous upper bound; string compare is safe
    const activeAtStart = (allSubs as any[]).filter((s) => (s.created_at as string).slice(0, 7) <= month).length;
    const churned = (allSubs as any[]).filter((s) =>
      ["canceled", "unpaid"].includes(s.status) &&
      (s.updated_at as string).slice(0, 7) === month
    ).length;
    const rate = activeAtStart > 0 ? Math.round((churned / activeAtStart) * 1000) / 10 : 0;
    return { label: month, value: rate };
  });
}

/**
 * Conversion Rate — percentage of signups (profiles.created_at) that
 * ended up with at least one paid subscription, bucketed by signup month.
 *
 * Useful for tracking how well the free-to-paid funnel is working over time.
 * Returns { label: "YYYY-MM", value: conversion% } per month.
 *
 * Scope note: "org" profiles only (role = 'org').  Researcher signups are
 * excluded — they don't have a billing relationship.
 */
export async function metricConversionRate(f: ReportFilters, client?: any): Promise<{ label: string; value: number }[]> {
  const supabase = client || createClient();

  // All org-role profiles
  let pq = supabase.from("profiles").select("id, created_at, org_id").eq("role", "org");
  if (f.dateFrom) pq = pq.gte("created_at", f.dateFrom);
  if (f.dateTo)   pq = pq.lte("created_at", f.dateTo);
  const { data: orgProfiles } = await pq;

  if (!orgProfiles?.length) return [];

  // All orgs with at least one active/paid subscription
  const { data: paidSubs } = await supabase
    .from("subscriptions")
    .select("org_id")
    .in("status", ["active", "trialing"]);
  const paidOrgIds = new Set((paidSubs ?? []).map((s: any) => s.org_id as string));

  const byMonth = new Map<string, { total: number; converted: number }>();
  for (const p of orgProfiles as any[]) {
    const month = (p.created_at as string).slice(0, 7);
    const entry = byMonth.get(month) ?? { total: 0, converted: 0 };
    entry.total++;
    if (p.org_id && paidOrgIds.has(p.org_id as string)) entry.converted++;
    byMonth.set(month, entry);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, { total, converted }]) => ({
      label,
      value: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
    }));
}

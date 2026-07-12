"use server";

import { createClient }   from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect }       from "next/navigation";
import { generateTestPlan, generatePentestReport } from "@/lib/ai/pentest";
import type { SeverityLevel } from "@/lib/supabase/types";

import { checkEntitlement } from "@/lib/billing/entitlements";

/* ─── Create engagement ───────────────────────────────────────────────────── */
export async function createEngagement(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles").select("org_id, role").eq("id", user.id).single();
  if (profile?.role !== "org" || !profile.org_id) {
    throw new Error("Only organizations can create pentest engagements");
  }

  // Entitlement Check: Gate concurrent PTaaS engagements
  const { count: concurrentCount } = await supabase
    .from("pentest_engagements")
    .select("id", { count: "exact", head: true })
    .eq("org_id", profile.org_id)
    .in("status", ["scheduled", "in_progress"]);

  const { allowed } = await checkEntitlement(profile.org_id, "ptaas_concurrent_engagements", concurrentCount || 0);
  if (!allowed) {
    throw new Error("PTAAS_LIMIT_EXCEEDED: You have reached the active concurrent pentest engagement limit for your tier. Please upgrade your plan.");
  }

  const name              = (formData.get("name") as string)?.trim();
  const scopeDescription  = (formData.get("scope_description") as string)?.trim();
  const objectives        = (formData.get("objectives") as string)?.trim();
  const startDate         = formData.get("start_date") as string;
  const endDate           = formData.get("end_date") as string;
  const assignedPentesterId = (formData.get("assigned_pentester_id") as string) || null;

  if (!name || !scopeDescription || !startDate || !endDate) {
    throw new Error("Name, scope, and dates are required");
  }
  if (new Date(endDate) < new Date(startDate)) {
    throw new Error("End date must be after start date");
  }

  const { data: engagement, error } = await supabase
    .from("pentest_engagements")
    .insert({
      org_id: profile.org_id,
      name,
      scope_description: scopeDescription,
      objectives: objectives || null,
      start_date: startDate,
      end_date: endDate,
      assigned_pentester_id: assignedPentesterId,
      created_by: user.id,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/ptaas");
  redirect(`/dashboard/ptaas/${engagement.id}`);
}

/* ─── Generate AI test plan ───────────────────────────────────────────────── */
export async function requestTestPlan(engagementId: string): Promise<void> {
  const supabase = createClient();
  const { data: engagement } = await supabase
    .from("pentest_engagements")
    .select("name, scope_description, objectives, start_date, end_date")
    .eq("id", engagementId)
    .single();
  if (!engagement) throw new Error("Engagement not found");

  const durationDays = Math.max(
    1,
    Math.round(
      (new Date(engagement.end_date).getTime() - new Date(engagement.start_date).getTime())
      / 86_400_000
    )
  );

  const plan = await generateTestPlan({
    engagementName: engagement.name,
    scopeDescription: engagement.scope_description,
    objectives: engagement.objectives,
    durationDays,
  });

  const { error } = await supabase
    .from("pentest_engagements")
    .update({ test_plan: plan })
    .eq("id", engagementId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/ptaas/${engagementId}`);
}

/* ─── Update engagement status ────────────────────────────────────────────── */
export async function updateEngagementStatus(
  engagementId: string,
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("pentest_engagements")
    .update({ status })
    .eq("id", engagementId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/ptaas/${engagementId}`);
  revalidatePath("/dashboard/ptaas");
}

/* ─── Add a finding ───────────────────────────────────────────────────────── */
export async function addFinding(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const engagementId        = formData.get("engagement_id") as string;
  const title                = (formData.get("title") as string)?.trim();
  const description          = (formData.get("description") as string)?.trim();
  const stepsToReproduce     = (formData.get("steps_to_reproduce") as string)?.trim();
  const impact                = (formData.get("impact") as string)?.trim();
  const severity              = formData.get("severity") as SeverityLevel;

  if (!engagementId || !title || !description || !severity) {
    throw new Error("Title, description, and severity are required");
  }

  const { data: finding, error } = await supabase
    .from("pentest_findings")
    .insert({
      engagement_id: engagementId,
      title,
      description,
      steps_to_reproduce: stepsToReproduce || null,
      impact: impact || null,
      severity,
      reported_by: user.id,
      status: "open",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/ptaas/${engagementId}`);
  redirect(`/dashboard/ptaas/${engagementId}`);
}

/* ─── Update finding status (including retest workflow) ──────────────────── */
export async function updateFindingStatus(
  findingId: string,
  engagementId: string,
  status: "open" | "fixed" | "needs_retest" | "closed" | "wont_fix",
  retestNotes?: string
): Promise<void> {
  const supabase = createClient();

  const updates: Record<string, unknown> = { status };
  if (status === "needs_retest" || status === "closed") {
    updates.retest_notes = retestNotes ?? null;
    updates.retested_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("pentest_findings")
    .update(updates)
    .eq("id", findingId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/ptaas/${engagementId}`);
}

/* ─── Generate AI report ──────────────────────────────────────────────────── */
export async function requestReport(engagementId: string): Promise<void> {
  const supabase = createClient();

  const [{ data: engagement }, { data: findings }] = await Promise.all([
    supabase.from("pentest_engagements")
      .select("name, scope_description, start_date, end_date")
      .eq("id", engagementId).single(),
    supabase.from("pentest_findings")
      .select("title, severity, status, description")
      .eq("engagement_id", engagementId),
  ]);

  if (!engagement) throw new Error("Engagement not found");

  const report = await generatePentestReport({
    engagementName: engagement.name,
    scopeDescription: engagement.scope_description,
    startDate: engagement.start_date,
    endDate: engagement.end_date,
    findings: findings ?? [],
  });

  const { error } = await supabase.from("pentest_reports").insert({
    engagement_id: engagementId,
    executive_summary: report.executiveSummary,
    full_report: {
      sections: report.sections,
      findings_summary: report.findingsSummary,
      recommendations: report.recommendations,
    },
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/ptaas/${engagementId}`);
}

/* ─── Assign / reassign pentester ─────────────────────────────────────────── */
export async function assignPentester(engagementId: string, pentesterId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("pentest_engagements")
    .update({ assigned_pentester_id: pentesterId || null })
    .eq("id", engagementId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/ptaas/${engagementId}`);
}

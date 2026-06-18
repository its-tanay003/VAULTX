"use server";

/**
 * UPDATED app/actions/triage.ts
 *
 * Drop-in replacement for Week 4's triage.ts.
 * Adds notification dispatch after every status change.
 * All notifications are fire-and-forget — never block the triager.
 */

import { createClient }   from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  notifySubmissionAccepted,
  notifySubmissionRejected,
  notifyNeedsInfo,
  notifyDuplicate,
} from "@/lib/notifications/service";
import type { SubmissionStatus } from "@/lib/supabase/types";

/* ─── Auth guard ──────────────────────────────────────────────────────────── */
async function assertTriagerAccess(supabase: ReturnType<typeof createClient>, submissionId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase.from("profiles").select("role, org_id").eq("id", user.id).single(),
    supabase
      .from("submissions")
      .select("id, status, researcher_id, title, severity, programs(name, type, org_id, organizations(name, owner_id))")
      .eq("id", submissionId)
      .single(),
  ]);

  if (!sub) throw new Error("Submission not found");

  const prog    = Array.isArray(sub.programs) ? sub.programs[0] : sub.programs;
  const org     = Array.isArray(prog?.organizations) ? prog.organizations[0] : prog?.organizations;
  const orgId   = prog?.org_id;

  const isOrgOwner = profile?.org_id === orgId;
  const isTriager  = ["triager","admin"].includes(profile?.role ?? "");
  if (!isOrgOwner && !isTriager) throw new Error("Access denied");

  return { userId: user.id, sub, prog, org };
}

/* ─── Core update ─────────────────────────────────────────────────────────── */
async function updateStatus(
  submissionId: string,
  status:       SubmissionStatus,
  note?:        string,
  extra?:       Record<string, unknown>
): Promise<{ sub: Record<string, unknown>; prog: Record<string, unknown>; org: Record<string, unknown> | null }> {
  const supabase = createClient();
  const { userId, sub, prog, org } = await assertTriagerAccess(supabase, submissionId);

  const { data: before } = await supabase
    .from("submissions")
    .select("status, triager_note")
    .eq("id", submissionId)
    .single();

  const { error } = await supabase
    .from("submissions")
    .update({ status, triager_id: userId, triager_note: note ?? null, ...extra })
    .eq("id", submissionId);

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    actor_id:  userId,
    action:    `submission.${status}`,
    entity:    "submissions",
    entity_id: submissionId,
    before:    { status: before?.status, note: before?.triager_note },
    after:     { status, note },
  });

  revalidatePath(`/dashboard/org/submissions/${submissionId}`);
  revalidatePath("/dashboard/org/submissions");
  revalidatePath("/dashboard/org");

  return { sub, prog: prog ?? {}, org: org ?? null };
}

/* ─── Public actions ──────────────────────────────────────────────────────── */

export async function acceptSubmission(submissionId: string, note?: string) {
  const { sub, prog, org } = await updateStatus(submissionId, "accepted", note);
  notifySubmissionAccepted({
    submissionId,
    submissionTitle: sub.title as string,
    programName:     (prog.name as string) ?? "",
    severity:        sub.severity as string,
    researcherId:    sub.researcher_id as string,
    orgName:         (org as Record<string, string>)?.name ?? "Organization",
    note,
  }).catch(console.error);
}

export async function rejectSubmission(submissionId: string, reason: string) {
  if (!reason?.trim()) throw new Error("Rejection reason is required");
  const { sub, prog, org } = await updateStatus(submissionId, "rejected", reason);
  notifySubmissionRejected({
    submissionId,
    submissionTitle: sub.title as string,
    programName:     (prog.name as string) ?? "",
    severity:        sub.severity as string,
    researcherId:    sub.researcher_id as string,
    orgName:         (org as Record<string, string>)?.name ?? "Organization",
    reason,
  }).catch(console.error);
}

export async function markDuplicate(submissionId: string, originalId: string, note?: string) {
  if (!originalId) throw new Error("Original submission ID required");

  // Load original title for the email
  const supabase = createClient();
  const { data: original } = await supabase
    .from("submissions").select("title").eq("id", originalId).single();

  const { sub, prog, org } = await updateStatus(submissionId, "duplicate", note, {
    ai_duplicate_of: originalId,
  });
  notifyDuplicate({
    submissionId,
    submissionTitle: sub.title as string,
    programName:     (prog.name as string) ?? "",
    severity:        sub.severity as string,
    researcherId:    sub.researcher_id as string,
    orgName:         (org as Record<string, string>)?.name ?? "Organization",
    note,
    duplicateTitle:  original?.title,
  }).catch(console.error);
}

export async function requestMoreInfo(submissionId: string, question: string) {
  if (!question?.trim()) throw new Error("Question is required");
  const { sub, prog, org } = await updateStatus(submissionId, "needs_info", question);
  notifyNeedsInfo({
    submissionId,
    submissionTitle: sub.title as string,
    programName:     (prog.name as string) ?? "",
    severity:        sub.severity as string,
    researcherId:    sub.researcher_id as string,
    orgName:         (org as Record<string, string>)?.name ?? "Organization",
    question,
  }).catch(console.error);
}

export async function markResolved(submissionId: string, note?: string) {
  await updateStatus(submissionId, "resolved", note);
}

export async function markWontFix(submissionId: string, reason: string) {
  if (!reason?.trim()) throw new Error("Reason is required");
  await updateStatus(submissionId, "wont_fix", reason);
}

export async function assignTriager(submissionId: string, triagerId: string) {
  const supabase = createClient();
  const { userId } = await assertTriagerAccess(supabase, submissionId);
  await supabase
    .from("submissions")
    .update({ triager_id: triagerId, status: "triaging" })
    .eq("id", submissionId);
  await supabase.from("audit_logs").insert({
    actor_id: userId, action: "submission.assigned",
    entity: "submissions", entity_id: submissionId,
    after: { triager_id: triagerId },
  });
  revalidatePath(`/dashboard/org/submissions/${submissionId}`);
}

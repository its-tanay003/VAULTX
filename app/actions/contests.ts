"use server";

import { createClient }    from "@/lib/supabase/server";
import { revalidatePath }  from "next/cache";
import { redirect }        from "next/navigation";
import { calculatePayouts }  from "@/lib/ai/contest-distribution";
import { suggestDuplicateGroups } from "@/lib/ai/contest-judge";

import { checkEntitlement } from "@/lib/billing/entitlements";

/* ─── Create contest ──────────────────────────────────────────────────────── */
export async function createContest(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles").select("org_id, role").eq("id", user.id).single();
  if (profile?.role !== "org" || !profile.org_id) {
    throw new Error("Only organizations can host audit contests");
  }

  // Entitlement Check: Gate active audit contests
  const { count: contestCount } = await supabase
    .from("audit_contests")
    .select("id", { count: "exact", head: true })
    .eq("org_id", profile.org_id)
    .in("status", ["draft", "open", "judging"]);

  const { allowed } = await checkEntitlement(profile.org_id, "contests_active", contestCount || 0);
  if (!allowed) {
    throw new Error("CONTESTS_LIMIT_EXCEEDED: You have reached the active audit contest limit for your tier. Please upgrade your plan.");
  }

  const title       = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const repoUrl     = (formData.get("repo_url") as string)?.trim();
  const repoBranch  = (formData.get("repo_branch") as string)?.trim() || "main";
  const scope       = (formData.get("scope_description") as string)?.trim();
  const poolAmount  = parseFloat(formData.get("pool_amount") as string);
  const startsAt    = formData.get("starts_at") as string;
  const endsAt      = formData.get("ends_at") as string;
  const isPublic    = formData.get("is_public") === "true";

  if (!title || !description || !repoUrl || !scope || !poolAmount || !startsAt || !endsAt) {
    throw new Error("All fields are required");
  }
  if (poolAmount <= 0) throw new Error("Pool amount must be positive");
  if (new Date(endsAt) <= new Date(startsAt)) throw new Error("End time must be after start time");

  const { data: contest, error } = await supabase
    .from("audit_contests")
    .insert({
      org_id:           profile.org_id,
      title,
      description,
      repo_url:         repoUrl,
      repo_branch:      repoBranch,
      scope_description: scope,
      pool_amount:      poolAmount,
      starts_at:        startsAt,
      ends_at:          endsAt,
      is_public:        isPublic,
      created_by:       user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/contests");
  redirect(`/dashboard/contests/${contest.id}`);
}

/* ─── Update contest status ───────────────────────────────────────────────── */
export async function updateContestStatus(
  contestId: string,
  status: "draft" | "open" | "judging" | "complete" | "archived"
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("audit_contests").update({ status }).eq("id", contestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/contests/${contestId}`);
  revalidatePath("/dashboard/contests");
}

/* ─── Submit a finding ────────────────────────────────────────────────────── */
export async function submitFinding(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const contestId     = formData.get("contest_id") as string;
  const title         = (formData.get("title") as string)?.trim();
  const description   = (formData.get("description") as string)?.trim();
  const severity      = formData.get("severity") as string;
  const steps         = (formData.get("steps_to_reproduce") as string)?.trim();
  const impact        = (formData.get("impact") as string)?.trim();
  const suggestedFix  = (formData.get("suggested_fix") as string)?.trim();
  const affectedFiles = (formData.get("affected_files") as string)
    ?.split("\n").map((l) => l.trim()).filter(Boolean);

  if (!contestId || !title || !description || !severity) {
    throw new Error("Title, description, and severity are required");
  }

  // Verify contest is open right now
  const { data: contest } = await supabase
    .from("audit_contests")
    .select("status, starts_at, ends_at")
    .eq("id", contestId)
    .single();

  if (contest?.status !== "open") throw new Error("Contest is not open for submissions");
  if (new Date(contest.starts_at) > new Date()) throw new Error("Contest hasn't started yet");
  if (new Date(contest.ends_at)   < new Date()) throw new Error("Contest submission period has ended");

  const { error } = await supabase.from("contest_findings").insert({
    contest_id:         contestId,
    auditor_id:         user.id,
    title,
    description,
    severity,
    steps_to_reproduce: steps || null,
    impact:             impact || null,
    suggested_fix:      suggestedFix || null,
    affected_files:     affectedFiles?.length ? affectedFiles : null,
  });

  if (error) {
    if (error.code === "23505") throw new Error("You already submitted a finding with this exact title in this contest");
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/contests/${contestId}/submit`);
  redirect(`/dashboard/contests/${contestId}`);
}

/* ─── Judge a finding (org only) ─────────────────────────────────────────── */
export async function judgeFinding(
  findingId: string,
  contestId: string,
  outcome: {
    status:             "valid" | "invalid" | "duplicate";
    judging_outcome:    "unique" | "duplicate_of" | null;
    duplicate_of:       string | null;
    confirmed_severity: string | null;
    judge_note:         string | null;
  }
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: contest } = await supabase
    .from("audit_contests")
    .select("org_id, organizations(owner_id)")
    .eq("id", contestId)
    .single();

  const org = Array.isArray(contest?.organizations) ? contest.organizations[0] : contest?.organizations;
  if (org?.owner_id !== user.id) throw new Error("Only the contest owner can judge findings");

  const { error } = await supabase
    .from("contest_findings")
    .update({
      status:             outcome.status,
      judging_outcome:    outcome.judging_outcome,
      duplicate_of:       outcome.duplicate_of,
      confirmed_severity: outcome.confirmed_severity,
      judge_note:         outcome.judge_note,
      judged_by:          user.id,
      judged_at:          new Date().toISOString(),
    })
    .eq("id", findingId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/contests/${contestId}/judge`);
}

/* ─── Get AI duplicate suggestions for the judging phase ─────────────────── */
export async function getAIDuplicateSuggestions(contestId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: findings } = await supabase
    .from("contest_findings")
    .select("id, title, description, severity, affected_files")
    .eq("contest_id", contestId)
    .eq("status", "submitted"); // only unjudged findings

  if (!findings?.length) return [];

  return suggestDuplicateGroups(findings);
}

/* ─── Finalize contest — compute payouts and write distribution ───────────── */
export async function finalizeContest(contestId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: contest } = await supabase
    .from("audit_contests")
    .select("pool_amount, status, organizations(owner_id)")
    .eq("id", contestId)
    .single();

  const org = Array.isArray(contest?.organizations) ? contest.organizations[0] : contest?.organizations;
  if (org?.owner_id !== user.id) throw new Error("Only the contest owner can finalize distribution");
  if (contest?.status !== "judging") throw new Error("Contest must be in judging phase to finalize");

  // Check all findings have been judged
  const { count: unjudged } = await supabase
    .from("contest_findings")
    .select("id", { count: "exact", head: true })
    .eq("contest_id", contestId)
    .eq("status", "submitted");

  if ((unjudged ?? 0) > 0) {
    throw new Error(`${unjudged} findings still need to be judged before finalizing`);
  }

  const { data: findings } = await supabase
    .from("contest_findings")
    .select("id, auditor_id, severity, confirmed_severity, status, duplicate_of")
    .eq("contest_id", contestId);

  const payouts = calculatePayouts(findings ?? [], Number(contest.pool_amount));

  if (payouts.length > 0) {
    const { error } = await supabase.from("contest_payouts").insert(
      payouts.map((p) => ({
        contest_id:   contestId,
        finding_id:   p.findingId,
        auditor_id:   p.auditorId,
        shares:       p.shares,
        payout_amount: p.payoutAmount,
        status:       "pending",
      }))
    );
    if (error) throw new Error(error.message);

    // Update each finding's payout_amount for display
    for (const p of payouts) {
      await supabase
        .from("contest_findings")
        .update({ payout_amount: p.payoutAmount })
        .eq("id", p.findingId);
    }
  }

  await supabase
    .from("audit_contests")
    .update({ status: "complete" })
    .eq("id", contestId);

  revalidatePath(`/dashboard/contests/${contestId}`);
  revalidatePath("/dashboard/contests");
}

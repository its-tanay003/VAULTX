"use server";

/**
 * VAULTX Reward Actions
 *
 * PLATFORM INVARIANT #1 (enforced twice):
 *   1. Application layer: approveReward() requires an authenticated human
 *      org owner/triager session — there is no code path for an AI agent
 *      or service account to call this function.
 *   2. Database layer: the `enforce_human_reward_approval` trigger from
 *      migration 001 raises an exception if approved_by is null on any
 *      row transitioning to status='approved' or 'paid'. Even a direct
 *      SQL update bypassing this file cannot violate the invariant.
 */

import { createClient }   from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyRewardApproved } from "@/lib/notifications/service";

/* ─── Auth guard ──────────────────────────────────────────────────────────── */
async function assertOrgAccess(
  supabase: ReturnType<typeof createClient>,
  submissionId: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: sub } = await supabase
    .from("submissions")
    .select(`
      id, title, severity, status, researcher_id,
      programs!inner(id, name, org_id, organizations(id, name, owner_id))
    `)
    .eq("id", submissionId)
    .single();

  if (!sub) throw new Error("Submission not found");

  const program = Array.isArray(sub.programs) ? sub.programs[0] : sub.programs;
  const org     = Array.isArray(program?.organizations) ? program.organizations[0] : program?.organizations;

  const { data: profile } = await supabase
    .from("profiles").select("role, org_id").eq("id", user.id).single();

  const isOrgOwner = org?.owner_id === user.id;
  const isAdmin    = profile?.role === "admin";

  if (!isOrgOwner && !isAdmin) {
    throw new Error("Only the organization owner can manage rewards");
  }

  return { userId: user.id, sub, program, org };
}

/* ─── Propose reward ──────────────────────────────────────────────────────── */
export async function proposeReward(
  submissionId: string,
  amount:       number,
  currency:     string,
  note?:        string
): Promise<void> {
  const supabase = createClient();
  const { userId, sub, org } = await assertOrgAccess(supabase, submissionId);

  if (sub.status !== "accepted") {
    throw new Error("Rewards can only be proposed for accepted submissions");
  }
  if (!amount || amount <= 0) {
    throw new Error("Reward amount must be greater than zero");
  }

  // One reward per submission (DB unique constraint also enforces this)
  const { data: existing } = await supabase
    .from("rewards").select("id").eq("submission_id", submissionId).maybeSingle();

  if (existing) throw new Error("A reward already exists for this submission");

  const { error } = await supabase.from("rewards").insert({
    submission_id: submissionId,
    org_id:        org?.id,
    researcher_id: sub.researcher_id,
    amount,
    currency,
    status:        "pending", // proposed, not yet approved — invariant not yet engaged
    note:          note ?? null,
  });

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    actor_id:  userId,
    action:    "reward.proposed",
    entity:    "rewards",
    entity_id: submissionId,
    after:     { amount, currency, status: "pending" },
  });

  revalidatePath(`/dashboard/org/submissions/${submissionId}`);
  revalidatePath("/dashboard/org/rewards");
}

/* ─── Approve reward (HUMAN ONLY — see invariant note above) ────────────────── */
export async function approveReward(rewardId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: reward } = await supabase
    .from("rewards")
    .select(`
      id, submission_id, org_id, researcher_id, amount, currency, status,
      submissions(title, programs(name)),
      organizations(name, owner_id),
      profiles!rewards_researcher_id_fkey(full_name, username)
    `)
    .eq("id", rewardId)
    .single();

  if (!reward) throw new Error("Reward not found");

  const org = Array.isArray(reward.organizations) ? reward.organizations[0] : reward.organizations;
  if (org?.owner_id !== user.id) {
    throw new Error("Only the organization owner can approve rewards");
  }

  // This update sets approved_by to the authenticated human's ID.
  // The DB trigger will REJECT this transaction if approved_by were null.
  const { error } = await supabase
    .from("rewards")
    .update({
      status:      "approved",
      approved_by: user.id,        // <-- the human approval, required by trigger
      approved_at: new Date().toISOString(),
    })
    .eq("id", rewardId);

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    actor_id:  user.id,
    action:    "reward.approved",
    entity:    "rewards",
    entity_id: rewardId,
    after:     { status: "approved", approved_by: user.id },
  });

  // Notify researcher
  const sub      = Array.isArray(reward.submissions) ? reward.submissions[0] : reward.submissions;
  const program  = Array.isArray(sub?.programs)       ? sub.programs[0]       : sub?.programs;
  const researcher = Array.isArray(reward.profiles)   ? reward.profiles[0]   : reward.profiles;

  notifyRewardApproved({
    submissionId:    reward.submission_id,
    submissionTitle: sub?.title ?? "",
    programName:     program?.name ?? "",
    researcherId:    reward.researcher_id,
    researcherName:  researcher?.full_name ?? researcher?.username ?? "",
    orgName:         org?.name ?? "Organization",
    amount:          reward.amount,
    currency:        reward.currency,
  }).catch(console.error);

  revalidatePath(`/dashboard/org/submissions/${reward.submission_id}`);
  revalidatePath("/dashboard/org/rewards");
  revalidatePath("/dashboard/researcher/rewards");
}

/* ─── Mark as paid ────────────────────────────────────────────────────────── */
export async function markRewardPaid(rewardId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: reward } = await supabase
    .from("rewards")
    .select("id, status, org_id, amount, organizations(owner_id), program_id:org_id")
    .eq("id", rewardId)
    .single();

  if (!reward) throw new Error("Reward not found");

  const org = Array.isArray(reward.organizations) ? reward.organizations[0] : reward.organizations;
  if (org?.owner_id !== user.id) throw new Error("Only the organization owner can mark rewards as paid");
  if (reward.status !== "approved") throw new Error("Reward must be approved before marking as paid");

  const { error } = await supabase
    .from("rewards")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", rewardId);

  if (error) throw new Error(error.message);

  // Increment program's total_paid counter (read-then-write, fine at this scale)
  const { data: rewardWithProgram } = await supabase
    .from("rewards")
    .select("submissions(program_id)")
    .eq("id", rewardId)
    .single();

  const sub = Array.isArray(rewardWithProgram?.submissions)
    ? rewardWithProgram.submissions[0] : rewardWithProgram?.submissions;

  if (sub?.program_id) {
    const { data: prog } = await supabase
      .from("programs").select("total_paid").eq("id", sub.program_id).single();

    if (prog) {
      await supabase
        .from("programs")
        .update({ total_paid: (prog.total_paid ?? 0) + reward.amount })
        .eq("id", sub.program_id);
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id:  user.id,
    action:    "reward.paid",
    entity:    "rewards",
    entity_id: rewardId,
    after:     { status: "paid" },
  });

  revalidatePath("/dashboard/org/rewards");
  revalidatePath("/dashboard/researcher/rewards");
}

/* ─── Decline reward proposal ─────────────────────────────────────────────── */
export async function declineReward(rewardId: string, reason: string): Promise<void> {
  if (!reason?.trim()) throw new Error("A reason is required to decline a reward");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: reward } = await supabase
    .from("rewards")
    .select("id, organizations(owner_id)")
    .eq("id", rewardId)
    .single();

  const org = Array.isArray(reward?.organizations) ? reward.organizations[0] : reward?.organizations;
  if (org?.owner_id !== user.id) throw new Error("Access denied");

  const { error } = await supabase
    .from("rewards")
    .update({ status: "declined", note: reason })
    .eq("id", rewardId);

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    actor_id:  user.id,
    action:    "reward.declined",
    entity:    "rewards",
    entity_id: rewardId,
    after:     { status: "declined", reason },
  });

  revalidatePath("/dashboard/org/rewards");
}

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
import { notifyRewardApproved, notifyPayoutSucceeded, notifyPayoutFailed } from "@/lib/notifications/service";
import { createTransfer } from "@/lib/stripe/client";

const MAX_PAYOUT_RETRIES = 5;

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

/* ─── Mark as paid — with threshold grouping (Batch 2) ───────────────────────
 *
 * Every guard from Batch 1 is preserved exactly: org-owner-only,
 * status === 'approved' required, idempotency key on every transfer.
 * Batch 2 adds: if the researcher's cumulative unpaid-approved total
 * hasn't reached their minimum_payout_threshold, this reward (and any
 * other held rewards for the same researcher) is held rather than
 * paid — the org sees "held" state honestly rather than a silent
 * no-op. Once crossed, ALL of that researcher's currently-held
 * rewards are paid together in a single combined Stripe transfer
 * (fewer transfer fees, one line item), not one-by-one.
 *
 * Rewards with active splits (reward_splits rows) are excluded from
 * threshold grouping entirely and paid via payRewardSplits() instead
 * — combining per-researcher threshold pooling with multi-recipient
 * splitting on the same reward would be a meaningfully more complex
 * feature for uncertain benefit, so this is a deliberate scope line,
 * not an oversight.
 */
export async function markRewardPaid(rewardId: string): Promise<{ held: boolean; groupedCount?: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: reward } = await supabase
    .from("rewards")
    .select(`
      id, status, org_id, amount, currency, submission_id, researcher_id, payout_retry_count,
      organizations(owner_id),
      profiles!rewards_researcher_id_fkey(full_name, username, stripe_account_id, stripe_payouts_enabled, minimum_payout_threshold)
    `)
    .eq("id", rewardId)
    .single();

  if (!reward) throw new Error("Reward not found");

  const org = Array.isArray(reward.organizations) ? reward.organizations[0] : reward.organizations;
  if (org?.owner_id !== user.id) throw new Error("Only the organization owner can mark rewards as paid");
  if (reward.status !== "approved") throw new Error("Reward must be approved before marking as paid");
  if ((reward.payout_retry_count ?? 0) >= MAX_PAYOUT_RETRIES) {
    throw new Error(`This payout has failed ${MAX_PAYOUT_RETRIES} times — contact Stripe support or the researcher before retrying further`);
  }

  const { count: splitCount } = await supabase
    .from("reward_splits").select("id", { count: "exact", head: true }).eq("reward_id", rewardId);
  if (splitCount && splitCount > 0) {
    throw new Error("This reward has payout splits configured — use paySplitReward() instead");
  }

  const researcher = Array.isArray(reward.profiles) ? reward.profiles[0] : reward.profiles;
  if (!researcher?.stripe_account_id || !researcher.stripe_payouts_enabled) {
    throw new Error("This researcher hasn't finished connecting Stripe yet — payout can't be sent until they do");
  }

  // ── Threshold check: gather ALL of this researcher's unpaid approved,
  // non-split rewards (including this one) to decide whether to hold or pay. ──
  const { data: unpaidRewards } = await supabase
    .from("rewards")
    .select("id, amount, currency, submission_id")
    .eq("researcher_id", reward.researcher_id)
    .eq("status", "approved")
    .eq("currency", reward.currency); // group only same-currency rewards into one transfer

  const eligibleRewards = unpaidRewards ?? [];
  // Exclude any that have splits — checked individually since split rewards
  // shouldn't be pooled into someone else's combined transfer.
  const { data: splitRewardIds } = await supabase
    .from("reward_splits").select("reward_id").in("reward_id", eligibleRewards.map((r) => r.id));
  const splitIdSet = new Set((splitRewardIds ?? []).map((s) => s.reward_id));
  const poolable = eligibleRewards.filter((r) => !splitIdSet.has(r.id));

  const threshold = researcher.minimum_payout_threshold ?? 50;
  const poolTotal = poolable.reduce((sum, r) => sum + r.amount, 0);

  if (poolTotal < threshold) {
    await supabase.from("rewards").update({ held_for_threshold: true }).in("id", poolable.map((r) => r.id));
    revalidatePath("/dashboard/org/rewards");
    return { held: true };
  }

  // ── Threshold crossed — pay everything in the pool as one transfer ──
  await supabase.from("rewards").update({ payout_status: "processing" }).in("id", poolable.map((r) => r.id));

  try {
    const amountCents = Math.round(poolTotal * 100);
    const { transferId } = await createTransfer({
      accountId:      researcher.stripe_account_id,
      amountCents,
      currency:       reward.currency,
      idempotencyKey: `pool:${poolable.map((r) => r.id).sort().join(",")}`, // stable across retries of the same pool
      metadata: {
        reward_ids: poolable.map((r) => r.id).join(","),
        researcher_id: reward.researcher_id,
        org_id: reward.org_id,
      },
    });

    await supabase
      .from("rewards")
      .update({
        status:             "paid",
        payout_status:      "succeeded",
        stripe_transfer_id: transferId,
        held_for_threshold: false,
        paid_at:            new Date().toISOString(),
      })
      .in("id", poolable.map((r) => r.id));

    await supabase.from("audit_logs").insert({
      actor_id:  user.id,
      action:    "reward.payout_succeeded",
      entity:    "rewards",
      entity_id: rewardId,
      after:     { status: "paid", stripe_transfer_id: transferId, pooled_reward_ids: poolable.map((r) => r.id), total: poolTotal, currency: reward.currency },
    });

    // Increment program totals + send receipt for each reward in the pool
    for (const pooled of poolable) {
      await incrementProgramTotalPaid(supabase, pooled.id, pooled.amount);
    }

    const { data: subInfo } = await supabase
      .from("submissions").select("title, programs(name)").eq("id", reward.submission_id).single();
    const program = Array.isArray(subInfo?.programs) ? subInfo.programs[0] : subInfo?.programs;
    const { data: orgInfo } = await supabase.from("organizations").select("name").eq("id", reward.org_id).single();

    notifyPayoutSucceeded({
      submissionId:    reward.submission_id,
      submissionTitle: subInfo?.title ?? "",
      programName:     program?.name ?? "",
      researcherId:    reward.researcher_id,
      researcherName:  researcher.full_name ?? researcher.username ?? "",
      orgName:         orgInfo?.name ?? "Organization",
      amount:          poolTotal,
      currency:        reward.currency,
      transferId,
    }).catch(console.error);

    revalidatePath("/dashboard/org/rewards");
    revalidatePath("/dashboard/researcher/rewards");
    return { held: false, groupedCount: poolable.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";

    await supabase
      .from("rewards")
      .update({ payout_status: "failed", payout_failure_reason: message })
      .in("id", poolable.map((r) => r.id));

    // Increment retry count per-row — each reward in the pool shares this
    // failure, so each counts toward its own MAX_PAYOUT_RETRIES cap.
    const { data: currentCounts } = await supabase
      .from("rewards").select("id, payout_retry_count").in("id", poolable.map((r) => r.id));
    await Promise.all(
      (currentCounts ?? []).map((r) =>
        supabase.from("rewards").update({ payout_retry_count: (r.payout_retry_count ?? 0) + 1 }).eq("id", r.id)
      )
    );

    await supabase.from("audit_logs").insert({
      actor_id:  user.id,
      action:    "reward.payout_failed",
      entity:    "rewards",
      entity_id: rewardId,
      after:     { payout_status: "failed", reason: message, pooled_reward_ids: poolable.map((r) => r.id) },
    });

    notifyPayoutFailed({
      orgOwnerId:      org.owner_id,
      submissionTitle: `${poolable.length} reward(s)`,
      researcherName:  researcher.full_name ?? researcher.username ?? "",
      amount:          poolTotal,
      currency:        reward.currency,
      reason:          message,
      rewardId,
    }).catch(console.error);

    throw new Error(`Payout failed: ${message}`);
  }
}

async function incrementProgramTotalPaid(supabase: ReturnType<typeof createClient>, rewardId: string, amount: number) {
  const { data: rewardWithProgram } = await supabase
    .from("rewards").select("submissions(program_id)").eq("id", rewardId).single();

  const sub = Array.isArray(rewardWithProgram?.submissions)
    ? rewardWithProgram.submissions[0] : rewardWithProgram?.submissions;

  if (sub?.program_id) {
    const { data: prog } = await supabase.from("programs").select("total_paid").eq("id", sub.program_id).single();
    if (prog) {
      await supabase.from("programs").update({ total_paid: (prog.total_paid ?? 0) + amount }).eq("id", sub.program_id);
    }
  }
}

/* ─── Batch payout: approve multiple researchers' rewards in one action ────── */
export async function batchPayRewards(rewardIds: string[]): Promise<{ succeeded: string[]; failed: { id: string; reason: string }[]; held: string[] }> {
  const succeeded: string[] = [];
  const failed: { id: string; reason: string }[] = [];
  const held: string[] = [];

  // Sequential, not Promise.all — these are real financial transfers;
  // running them concurrently risks the same researcher's rewards being
  // double-pooled by two overlapping calls reading stale state.
  for (const id of rewardIds) {
    try {
      const result = await markRewardPaid(id);
      if (result.held) held.push(id);
      else succeeded.push(id);
    } catch (err: unknown) {
      failed.push({ id, reason: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { succeeded, failed, held };
}

/* ─── Payout splitting: divide one reward across multiple researchers ──────── */
export async function proposeSplitReward(
  rewardId: string,
  splits: { researcherId: string; sharePercent: number }[]
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const totalPercent = splits.reduce((sum, s) => sum + s.sharePercent, 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Split percentages must sum to 100 (got ${totalPercent})`);
  }

  const { data: reward } = await supabase
    .from("rewards").select("id, org_id, status, organizations(owner_id)").eq("id", rewardId).single();
  if (!reward) throw new Error("Reward not found");

  const org = Array.isArray(reward.organizations) ? reward.organizations[0] : reward.organizations;
  if (org?.owner_id !== user.id) throw new Error("Only the organization owner can configure payout splits");
  if (reward.status === "paid") throw new Error("Can't modify splits on an already-paid reward");

  await supabase.from("reward_splits").delete().eq("reward_id", rewardId); // replace any prior config

  const { error } = await supabase.from("reward_splits").insert(
    splits.map((s) => ({ reward_id: rewardId, researcher_id: s.researcherId, share_percent: s.sharePercent }))
  );
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    actor_id: user.id, action: "reward.split_configured", entity: "rewards", entity_id: rewardId,
    after: { splits },
  });

  revalidatePath(`/dashboard/org/submissions/${rewardId}`);
}

/** Pays out a reward's configured splits — one Stripe transfer per recipient. */
export async function paySplitReward(rewardId: string): Promise<{ succeeded: string[]; failed: { researcherId: string; reason: string }[] }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: reward } = await supabase
    .from("rewards")
    .select("id, status, amount, currency, submission_id, org_id, organizations(owner_id)")
    .eq("id", rewardId).single();
  if (!reward) throw new Error("Reward not found");

  const org = Array.isArray(reward.organizations) ? reward.organizations[0] : reward.organizations;
  if (org?.owner_id !== user.id) throw new Error("Only the organization owner can pay out rewards");
  if (reward.status !== "approved") throw new Error("Reward must be approved before paying");

  const { data: splits } = await supabase
    .from("reward_splits")
    .select("id, researcher_id, share_percent, profiles!reward_splits_researcher_id_fkey(full_name, username, stripe_account_id, stripe_payouts_enabled)")
    .eq("reward_id", rewardId);

  if (!splits?.length) throw new Error("No splits configured for this reward — use markRewardPaid() instead");

  const succeeded: string[] = [];
  const failed: { researcherId: string; reason: string }[] = [];

  for (const split of splits) {
    const researcher = Array.isArray(split.profiles) ? split.profiles[0] : split.profiles;
    const splitAmount = Math.round(reward.amount * (split.share_percent / 100));

    if (!researcher?.stripe_account_id || !researcher.stripe_payouts_enabled) {
      failed.push({ researcherId: split.researcher_id, reason: "Researcher hasn't connected Stripe yet" });
      await supabase.from("reward_splits").update({ payout_status: "failed", payout_failure_reason: "Stripe not connected", amount: splitAmount }).eq("id", split.id);
      continue;
    }

    try {
      const { transferId } = await createTransfer({
        accountId:      researcher.stripe_account_id,
        amountCents:    Math.round(splitAmount * 100),
        currency:       reward.currency,
        idempotencyKey: `split:${split.id}`,
        metadata: { reward_id: rewardId, split_id: split.id, researcher_id: split.researcher_id },
      });

      await supabase.from("reward_splits").update({
        amount: splitAmount, payout_status: "succeeded", stripe_transfer_id: transferId,
      }).eq("id", split.id);

      succeeded.push(split.researcher_id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown Stripe error";
      await supabase.from("reward_splits").update({ payout_status: "failed", payout_failure_reason: message, amount: splitAmount }).eq("id", split.id);
      failed.push({ researcherId: split.researcher_id, reason: message });
    }
  }

  // Reward as a whole is "paid" once every split succeeded; otherwise it
  // stays approved so a failed split can be retried without re-paying the
  // ones that already succeeded (each transfer's idempotency key is
  // per-split, so re-running this function only retries what's still failed).
  if (failed.length === 0) {
    await supabase.from("rewards").update({ status: "paid", payout_status: "succeeded", paid_at: new Date().toISOString() }).eq("id", rewardId);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id, action: "reward.split_payout_attempted", entity: "rewards", entity_id: rewardId,
    after: { succeeded, failed },
  });

  revalidatePath("/dashboard/org/rewards");
  return { succeeded, failed };
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

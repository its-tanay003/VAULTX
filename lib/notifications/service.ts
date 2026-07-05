/**
 * VAULTX Notification Service
 *
 * Two channels per event:
 *   1. In-app notification (Supabase → realtime broadcast)
 *   2. Email (Resend) — respects user preferences
 *
 * Always fire-and-forget. Never block user-facing actions.
 */

import { createClient }    from "@/lib/supabase/server";
import { sendEmail }       from "@/lib/email/resend";
import { sendPushToUser }  from "@/lib/notifications/push";
import {
  submissionReceivedEmail,
  submissionAcceptedEmail,
  submissionRejectedEmail,
  submissionNeedsInfoEmail,
  submissionDuplicateEmail,
  rewardApprovedEmail,
  payoutReceiptEmail,
  payoutFailedEmail,
} from "@/lib/email/templates/submission";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://vaultx.io";

/* ─── Core notification creator ──────────────────────────────────────────── */
async function createNotification(params: {
  userId:   string;
  type:     string;
  title:    string;
  body:     string;
  link?:    string;
  entity?:  string;
  entityId?:string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("notifications").insert({
    user_id:   params.userId,
    type:      params.type,
    title:     params.title,
    body:      params.body,
    link:      params.link ?? null,
    entity:    params.entity ?? null,
    entity_id: params.entityId ?? null,
  });
  if (error) console.error("[Notify] Insert failed:", error.message);

  // Fire-and-forget: never let a push failure affect the calling event.
  // No-ops instantly if the user has no active push subscriptions.
  sendPushToUser(params.userId, {
    title: params.title,
    body:  params.body,
    link:  params.link,
    tag:   params.entityId,
  }).catch((err) => console.error("[Notify] Push dispatch failed:", err));
}

/* ─── Preference check ────────────────────────────────────────────────────── */
async function shouldEmailUser(
  userId:     string,
  prefField:  "email_submission_new" | "email_submission_update" | "email_reward_update"
): Promise<string | null> {
  const supabase = createClient();
  const [{ data: prefs }, { data: profile }] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select(prefField)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single(),
  ]);

  if (!profile?.email) return null;
  if (prefs && (prefs as any)[prefField] === false) return null;
  return profile.email;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Event: New submission received (notify ORG)                                */
/* ─────────────────────────────────────────────────────────────────────────── */
export async function notifySubmissionReceived(params: {
  submissionId:    string;
  submissionTitle: string;
  programId:       string;
  programName:     string;
  severity:        string;
  researcherName:  string;
  orgOwnerId:      string;
}): Promise<void> {
  const link = `/dashboard/org/submissions/${params.submissionId}`;

  await createNotification({
    userId:   params.orgOwnerId,
    type:     "submission_received",
    title:    "New vulnerability report",
    body:     `${params.researcherName} submitted a ${params.severity} report to ${params.programName}`,
    link,
    entity:   "submissions",
    entityId: params.submissionId,
  });

  const email = await shouldEmailUser(params.orgOwnerId, "email_submission_new");
  if (email) {
    await sendEmail({
      to:      email,
      subject: `[VAULTX] New ${params.severity} report: ${params.submissionTitle}`,
      html:    submissionReceivedEmail({
        submissionId:    params.submissionId,
        submissionTitle: params.submissionTitle,
        programName:     params.programName,
        severity:        params.severity,
        researcherName:  params.researcherName,
      }),
    });
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Event: Submission accepted (notify RESEARCHER)                             */
/* ─────────────────────────────────────────────────────────────────────────── */
export async function notifySubmissionAccepted(params: {
  submissionId:    string;
  submissionTitle: string;
  programName:     string;
  severity:        string;
  researcherId:    string;
  orgName:         string;
  note?:           string;
}): Promise<void> {
  const link = `/dashboard/researcher/submissions/${params.submissionId}`;

  await createNotification({
    userId:   params.researcherId,
    type:     "submission_accepted",
    title:    "Report accepted ✓",
    body:     `Your report "${params.submissionTitle}" was accepted by ${params.orgName}`,
    link,
    entity:   "submissions",
    entityId: params.submissionId,
  });

  const email = await shouldEmailUser(params.researcherId, "email_submission_update");
  if (email) {
    await sendEmail({
      to:      email,
      subject: `[VAULTX] Report accepted: ${params.submissionTitle}`,
      html:    submissionAcceptedEmail({
        submissionId:    params.submissionId,
        submissionTitle: params.submissionTitle,
        programName:     params.programName,
        severity:        params.severity,
        researcherName:  "",
        orgName:         params.orgName,
        note:            params.note,
      }),
    });
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Event: Submission rejected                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
export async function notifySubmissionRejected(params: {
  submissionId:    string;
  submissionTitle: string;
  programName:     string;
  severity:        string;
  researcherId:    string;
  orgName:         string;
  reason:          string;
}): Promise<void> {
  const link = `/dashboard/researcher/submissions/${params.submissionId}`;

  await createNotification({
    userId:   params.researcherId,
    type:     "submission_rejected",
    title:    "Report not accepted",
    body:     `"${params.submissionTitle}" was rejected by ${params.orgName}`,
    link,
    entity:   "submissions",
    entityId: params.submissionId,
  });

  const email = await shouldEmailUser(params.researcherId, "email_submission_update");
  if (email) {
    await sendEmail({
      to:      email,
      subject: `[VAULTX] Report update: ${params.submissionTitle}`,
      html:    submissionRejectedEmail({
        submissionId:    params.submissionId,
        submissionTitle: params.submissionTitle,
        programName:     params.programName,
        severity:        params.severity,
        researcherName:  "",
        orgName:         params.orgName,
        note:            params.reason,
      }),
    });
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Event: Needs more info                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
export async function notifyNeedsInfo(params: {
  submissionId:    string;
  submissionTitle: string;
  programName:     string;
  severity:        string;
  researcherId:    string;
  orgName:         string;
  question:        string;
}): Promise<void> {
  const link = `/dashboard/researcher/submissions/${params.submissionId}`;

  await createNotification({
    userId:   params.researcherId,
    type:     "submission_needs_info",
    title:    "Action needed on your report",
    body:     `${params.orgName} needs more information on "${params.submissionTitle}"`,
    link,
    entity:   "submissions",
    entityId: params.submissionId,
  });

  const email = await shouldEmailUser(params.researcherId, "email_submission_update");
  if (email) {
    await sendEmail({
      to:      email,
      subject: `[VAULTX] Action needed: ${params.submissionTitle}`,
      html:    submissionNeedsInfoEmail({
        submissionId:    params.submissionId,
        submissionTitle: params.submissionTitle,
        programName:     params.programName,
        severity:        params.severity,
        researcherName:  "",
        orgName:         params.orgName,
        note:            params.question,
      }),
    });
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Event: Marked duplicate                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
export async function notifyDuplicate(params: {
  submissionId:    string;
  submissionTitle: string;
  programName:     string;
  severity:        string;
  researcherId:    string;
  orgName:         string;
  note?:           string;
  duplicateTitle?: string;
}): Promise<void> {
  const link = `/dashboard/researcher/submissions/${params.submissionId}`;

  await createNotification({
    userId:   params.researcherId,
    type:     "submission_duplicate",
    title:    "Report marked as duplicate",
    body:     `"${params.submissionTitle}" was marked as a duplicate by ${params.orgName}`,
    link,
    entity:   "submissions",
    entityId: params.submissionId,
  });

  const email = await shouldEmailUser(params.researcherId, "email_submission_update");
  if (email) {
    await sendEmail({
      to:      email,
      subject: `[VAULTX] Report update: ${params.submissionTitle}`,
      html:    submissionDuplicateEmail({
        submissionId:    params.submissionId,
        submissionTitle: params.submissionTitle,
        programName:     params.programName,
        severity:        params.severity,
        researcherName:  "",
        orgName:         params.orgName,
        note:            params.note,
        duplicateTitle:  params.duplicateTitle,
      }),
    });
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Event: Reward approved (notify RESEARCHER)                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
export async function notifyRewardApproved(params: {
  submissionId:    string;
  submissionTitle: string;
  programName:     string;
  researcherId:    string;
  researcherName:  string;
  orgName:         string;
  amount:          number;
  currency:        string;
}): Promise<void> {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency", currency: params.currency, minimumFractionDigits: 0,
  }).format(params.amount);

  await createNotification({
    userId:   params.researcherId,
    type:     "reward_approved",
    title:    `Reward approved: ${formatted}`,
    body:     `${params.orgName} approved a ${formatted} reward for "${params.submissionTitle}"`,
    link:     "/dashboard/researcher/rewards",
    entity:   "rewards",
    entityId: params.submissionId,
  });

  const email = await shouldEmailUser(params.researcherId, "email_reward_update");
  if (email) {
    await sendEmail({
      to:      email,
      subject: `[VAULTX] Reward approved: ${formatted}`,
      html:    rewardApprovedEmail({
        submissionTitle: params.submissionTitle,
        programName:     params.programName,
        amount:          params.amount,
        currency:        params.currency,
        orgName:         params.orgName,
        researcherName:  params.researcherName,
      }),
    });
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Event: Payout succeeded (notify RESEARCHER — receipt)                      */
/* ─────────────────────────────────────────────────────────────────────────── */
export async function notifyPayoutSucceeded(params: {
  submissionId:    string;
  submissionTitle: string;
  programName:     string;
  researcherId:    string;
  researcherName:  string;
  orgName:         string;
  amount:          number;
  currency:        string;
  transferId:      string;
}): Promise<void> {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency", currency: params.currency, minimumFractionDigits: 0,
  }).format(params.amount);

  await createNotification({
    userId:   params.researcherId,
    type:     "payout_succeeded",
    title:    `Payout sent: ${formatted}`,
    body:     `${formatted} has been transferred to your connected Stripe account`,
    link:     "/dashboard/researcher/rewards",
    entity:   "rewards",
    entityId: params.submissionId,
  });

  const email = await shouldEmailUser(params.researcherId, "email_reward_update");
  if (email) {
    await sendEmail({
      to:      email,
      subject: `[VAULTX] Payout sent: ${formatted}`,
      html:    payoutReceiptEmail({
        submissionTitle: params.submissionTitle,
        programName:     params.programName,
        amount:          params.amount,
        currency:        params.currency,
        orgName:         params.orgName,
        researcherName:  params.researcherName,
        transferId:      params.transferId,
      }),
    });
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Event: Payout failed (notify ORG OWNER — admin alert, not researcher)      */
/* ─────────────────────────────────────────────────────────────────────────── */
export async function notifyPayoutFailed(params: {
  orgOwnerId:      string;
  submissionTitle: string;
  researcherName:  string;
  amount:          number;
  currency:        string;
  reason:          string;
  rewardId:        string;
}): Promise<void> {
  await createNotification({
    userId:   params.orgOwnerId,
    type:     "payout_failed",
    title:    `Payout failed — action needed`,
    body:     `A payout to ${params.researcherName} failed: ${params.reason}`,
    link:     "/dashboard/org/rewards",
    entity:   "rewards",
    entityId: params.rewardId,
  });

  // Admin alerts always email regardless of preference — this is an
  // action-needed failure state, not a routine update the org can opt out of.
  const supabase = createClient();
  const { data: orgOwner } = await supabase.from("profiles").select("email").eq("id", params.orgOwnerId).single();
  if (orgOwner?.email) {
    await sendEmail({
      to:      orgOwner.email,
      subject: `[VAULTX] Payout failed — action needed`,
      html:    payoutFailedEmail({
        submissionTitle: params.submissionTitle,
        researcherName:  params.researcherName,
        amount:          params.amount,
        currency:        params.currency,
        reason:          params.reason,
      }),
    });
  }
}


export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  const supabase = createClient();
  let q = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId);

  if (ids?.length) {
    q = q.in("id", ids);
  } else {
    q = q.eq("is_read", false);
  }

  await q;
}

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { downgradedNoticeEmail, finalPaymentWarningEmail } from "@/lib/email/templates/billing";

/**
 * GET /api/cron/billing-grace-period
 *
 * Daily job to enforce the 7-day grace period for unpaid subscriptions.
 * Authenticated by x-vault-secret.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-vault-secret");
  if (secret !== process.env.VAULT_INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // Find all subscriptions in past_due status
  const { data: pastDueSubs, error: fetchErr } = await supabase
    .from("subscriptions")
    .select("*, plans(name)")
    .eq("status", "past_due");

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  let downgradedCount = 0;
  let warningCount = 0;
  const errors: string[] = [];

  for (const sub of pastDueSubs || []) {
    if (!sub.payment_failed_at) continue;

    const failedDate = new Date(sub.payment_failed_at);
    const msDiff = now.getTime() - failedDate.getTime();
    const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name, owner_id")
      .eq("id", sub.org_id)
      .single();

    if (!org) continue;

    const { data: owner } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", org.owner_id)
      .single();

    try {
      if (daysDiff >= 7) {
        // 1. Downgrade to free tier in DB
        await supabase
          .from("organizations")
          .update({ subscription_tier: "free" })
          .eq("id", sub.org_id);

        // 2. Set subscription status to canceled
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("id", sub.id);

        // 3. Email Downgraded Notice
        if (owner?.email) {
          await sendEmail({
            to: owner.email,
            subject: `[VAULTX] Organization ${org.name} downgraded to Free tier`,
            html: downgradedNoticeEmail({ orgName: org.name }),
          });
        }
        downgradedCount++;
      } else if (daysDiff === 5) {
        // Email Warning Notice (Day 5 warning)
        if (owner?.email) {
          const plan = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
          await sendEmail({
            to: owner.email,
            subject: `[VAULTX] Action Required: Subscription downgrading in 48 hours`,
            html: finalPaymentWarningEmail({ orgName: org.name, planName: plan?.name }),
          });
        }
        warningCount++;
      }
    } catch (err: unknown) {
      errors.push(`Sub ${sub.id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ downgradedCount, warningCount, errors });
}

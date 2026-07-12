import {
  emailBase, emailH1, emailP, emailDivider, emailButton, emailMeta, escHtml,
} from "./base";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://vaultx.io";

export interface BillingEmailData {
  orgName: string;
  planName?: string;
  billingPortalUrl?: string;
}

/**
 * 1. Payment Failed Email (Day 1)
 */
export function paymentFailedEmail(d: BillingEmailData): string {
  const url = d.billingPortalUrl || `${APP}/dashboard/org/billing`;
  return emailBase({
    title: `Payment failed for organization ${d.orgName}`,
    previewText: `Your payment for VAULTX failed. Update your card to maintain access.`,
    body: `
      ${emailH1("Payment Failed ⚠")}
      ${emailP(`We were unable to process the subscription payment for <strong style="color:#fafafa;">${escHtml(d.orgName)}</strong>.`)}
      ${emailP("Stripe will automatically retry the charge shortly. To prevent any interruption to your active pentests, code audits, or AI triage services, please update your billing details.")}
      ${emailDivider()}
      ${emailP("You have entered a 7-day grace period. If payment is not resolved by the end of this period, your organization will be automatically downgraded to the Free tier.", true)}
      ${emailButton("Update Payment Method", url)}
    `,
  });
}

/**
 * 2. Final Payment Warning Email (Day 5)
 */
export function finalPaymentWarningEmail(d: BillingEmailData): string {
  const url = d.billingPortalUrl || `${APP}/dashboard/org/billing`;
  return emailBase({
    title: `Action Required: Subscription downgrading in 48 hours`,
    previewText: `Second payment failure warning for ${d.orgName}.`,
    body: `
      ${emailH1("Final Payment Warning ⌛")}
      ${emailP(`This is a final warning that the subscription payment for <strong style="color:#fafafa;">${escHtml(d.orgName)}</strong> remains unpaid.`)}
      ${emailP("In 48 hours, your organization will be downgraded to the Free tier. This will immediately pause active campaigns, limit team seats to 1, and disable advanced Web3 audits and assistant features.")}
      ${emailDivider()}
      ${emailButton("Resolve Payment Now", url)}
    `,
  });
}

/**
 * 3. Downgraded to Free Notice (Day 7)
 */
export function downgradedNoticeEmail(d: BillingEmailData): string {
  const url = `${APP}/dashboard/org/billing`;
  return emailBase({
    title: `Organization ${d.orgName} downgraded to Free tier`,
    previewText: `Grace period expired. Organization downgraded.`,
    body: `
      ${emailH1("Organization Downgraded ⬇")}
      ${emailP(`The 7-day grace period for <strong style="color:#fafafa;">${escHtml(d.orgName)}</strong> has expired with no successful payment.`)}
      ${emailP("Your subscription has been cancelled, and the workspace has been downgraded to the Free tier. Resource limits have been restricted, and active campaigns are currently paused.")}
      ${emailDivider()}
      ${emailP("You can re-subscribe at any time to recover your seats and resume active testing operations.", true)}
      ${emailButton("Choose a Plan", url)}
    `,
  });
}

/**
 * 4. Upgrade Confirmation
 */
export function upgradeConfirmationEmail(d: BillingEmailData): string {
  const url = `${APP}/dashboard/org/billing`;
  return emailBase({
    title: `Upgrade confirmed: Welcome to ${d.planName || "Paid"} Tier`,
    previewText: `Thank you for subscribing to VAULTX!`,
    body: `
      ${emailH1("Upgrade Confirmed! 🎉")}
      ${emailP(`Thank you for upgrading <strong style="color:#fafafa;">${escHtml(d.orgName)}</strong> to the <strong style="color:#2dd4bf;">${escHtml(d.planName || "")}</strong> plan.`)}
      ${emailP("Your new limits are now active. You can add more team members, scope additional PTaaS concurrent engagements, and run more AI triage scans immediately.")}
      ${emailDivider()}
      ${emailButton("Go to Billing Settings", url)}
    `,
  });
}

/**
 * 5. Cancellation Confirmation
 */
export function cancellationConfirmationEmail(d: BillingEmailData): string {
  const url = `${APP}/dashboard/org/billing`;
  return emailBase({
    title: `Subscription cancellation confirmed`,
    previewText: `Your subscription cancellation request has been processed.`,
    body: `
      ${emailH1("Subscription Cancelled ✕")}
      ${emailP(`We've processed the request to cancel your subscription for <strong style="color:#fafafa;">${escHtml(d.orgName)}</strong>.`)}
      ${emailP(`You will retain access to the benefits of the ${escHtml(d.planName || "paid")} plan until the end of your current billing cycle.`)}
      ${emailDivider()}
      ${emailP("We're sorry to see you go. If this was an accident or you decide to rejoin, you can reactivate your subscription from your billing dashboard.", true)}
      ${emailButton("Manage Billing", url)}
    `,
  });
}

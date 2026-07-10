import {
  emailBase, emailH1, emailP, emailBadge,
  emailDivider, emailButton, emailMeta, escHtml,
} from "./base";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://vaultx.io";

/* ─── Types ───────────────────────────────────────────────────────────────── */
export interface SubmissionEmailData {
  submissionId:   string;
  submissionTitle:string;
  programName:    string;
  severity:       string;
  researcherName: string;
  orgName?:       string;
  note?:          string;
  duplicateTitle?:string;
}

export interface RewardEmailData {
  submissionTitle: string;
  programName:     string;
  amount:          number;
  currency:        string;
  orgName:         string;
  researcherName:  string;
}

/* ─── Severity color helper ───────────────────────────────────────────────── */
function sevColor(s: string): "red"|"yellow"|"teal"|"zinc" {
  if (s === "critical" || s === "high") return "red";
  if (s === "medium")                   return "yellow";
  if (s === "low")                      return "teal";
  return "zinc";
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* 1. Submission received (to ORG)                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
export function submissionReceivedEmail(d: SubmissionEmailData): string {
  const url = `${APP}/dashboard/org/submissions/${d.submissionId}`;
  return emailBase({
    title:       `New report: ${d.submissionTitle}`,
    previewText: `${d.researcherName} submitted a ${d.severity} severity report to ${d.programName}`,
    body: `
      ${emailH1("New vulnerability report")}
      ${emailP(`A researcher has submitted a report to <strong style="color:#fafafa;">${escHtml(d.programName)}</strong>.`)}
      ${emailDivider()}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
        ${emailMeta("Title",      `<span style="color:#fafafa;">${escHtml(d.submissionTitle)}</span>`)}
        ${emailMeta("Severity",   emailBadge(d.severity.toUpperCase(), sevColor(d.severity)))}
        ${emailMeta("Researcher", escHtml(d.researcherName))}
        ${emailMeta("Program",    escHtml(d.programName))}
      </table>
      ${emailP("AI has automatically screened this submission for duplicates and suggested a severity. Review the full report and triage it.", true)}
      ${emailButton("Review Report", url)}
    `,
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* 2. Submission accepted (to RESEARCHER)                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
export function submissionAcceptedEmail(d: SubmissionEmailData): string {
  const url = `${APP}/dashboard/researcher/submissions/${d.submissionId}`;
  return emailBase({
    title:       `Report accepted: ${d.submissionTitle}`,
    previewText: `Great news — your ${d.severity} report was accepted by ${d.orgName}`,
    body: `
      ${emailH1("Your report was accepted ✓")}
      ${emailP(`<strong style="color:#fafafa;">${escHtml(d.orgName ?? "")}</strong> has reviewed and accepted your vulnerability report.`)}
      ${emailDivider()}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
        ${emailMeta("Report",   `<span style="color:#fafafa;">${escHtml(d.submissionTitle)}</span>`)}
        ${emailMeta("Severity", emailBadge(d.severity.toUpperCase(), sevColor(d.severity)))}
        ${emailMeta("Program",  escHtml(d.programName))}
        ${emailMeta("Status",   emailBadge("ACCEPTED", "green"))}
      </table>
      ${d.note ? `
        <div style="background:#0d2b29;border:1px solid #1a4340;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:500;color:#2dd4bf;text-transform:uppercase;letter-spacing:0.5px;">Note from triager</p>
          <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">${escHtml(d.note)}</p>
        </div>` : ""}
      ${emailP("The reward team will be in touch regarding compensation. Your reputation score has been updated.", true)}
      ${emailButton("View Report", url)}
    `,
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* 3. Submission rejected (to RESEARCHER)                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
export function submissionRejectedEmail(d: SubmissionEmailData): string {
  const url = `${APP}/dashboard/researcher/submissions/${d.submissionId}`;
  return emailBase({
    title:       `Report update: ${d.submissionTitle}`,
    previewText: `Your report to ${d.programName} was not accepted`,
    body: `
      ${emailH1("Report not accepted")}
      ${emailP(`After review, <strong style="color:#fafafa;">${escHtml(d.orgName ?? "")}</strong> has decided not to accept this report.`)}
      ${emailDivider()}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
        ${emailMeta("Report",  `<span style="color:#fafafa;">${escHtml(d.submissionTitle)}</span>`)}
        ${emailMeta("Program", escHtml(d.programName))}
        ${emailMeta("Status",  emailBadge("REJECTED", "red"))}
      </table>
      ${d.note ? `
        <div style="background:#2d0a0a;border:1px solid #5c1414;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:500;color:#f87171;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
          <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">${escHtml(d.note)}</p>
        </div>` : ""}
      ${emailP("Don't be discouraged — use this feedback to sharpen future reports. Check the program scope and rules carefully before your next submission.", true)}
      ${emailButton("View Report", url)}
    `,
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* 4. Needs more info (to RESEARCHER)                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
export function submissionNeedsInfoEmail(d: SubmissionEmailData): string {
  const url = `${APP}/dashboard/researcher/submissions/${d.submissionId}`;
  return emailBase({
    title:       `Action needed: ${d.submissionTitle}`,
    previewText: `${d.orgName} needs more information on your report`,
    body: `
      ${emailH1("Additional information requested")}
      ${emailP(`<strong style="color:#fafafa;">${escHtml(d.orgName ?? "")}</strong> is reviewing your report and needs clarification before proceeding.`)}
      ${emailDivider()}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
        ${emailMeta("Report",  `<span style="color:#fafafa;">${escHtml(d.submissionTitle)}</span>`)}
        ${emailMeta("Program", escHtml(d.programName))}
        ${emailMeta("Status",  emailBadge("INFO REQUESTED", "yellow"))}
      </table>
      ${d.note ? `
        <div style="background:#2d2007;border:1px solid #5c3e0a;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:500;color:#fbbf24;text-transform:uppercase;letter-spacing:0.5px;">Question from triager</p>
          <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">${escHtml(d.note)}</p>
        </div>` : ""}
      ${emailP("Respond promptly to keep your report active. Reports with no response for 14 days may be closed.", true)}
      ${emailButton("Respond to Request", url)}
    `,
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* 5. Marked as duplicate (to RESEARCHER)                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
export function submissionDuplicateEmail(d: SubmissionEmailData): string {
  const url = `${APP}/dashboard/researcher/submissions/${d.submissionId}`;
  return emailBase({
    title:       `Report update: ${d.submissionTitle}`,
    previewText: `Your report was marked as a duplicate of an existing submission`,
    body: `
      ${emailH1("Report marked as duplicate")}
      ${emailP(`<strong style="color:#fafafa;">${escHtml(d.orgName ?? "")}</strong> has determined this report is a duplicate of a previously submitted finding.`)}
      ${emailDivider()}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
        ${emailMeta("Your Report", `<span style="color:#fafafa;">${escHtml(d.submissionTitle)}</span>`)}
        ${emailMeta("Program",     escHtml(d.programName))}
        ${emailMeta("Status",      emailBadge("DUPLICATE", "zinc"))}
        ${d.duplicateTitle ? emailMeta("Original", `<span style="color:#a1a1aa;">${escHtml(d.duplicateTitle)}</span>`) : ""}
      </table>
      ${d.note ? `
        <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:500;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Triager note</p>
          <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">${escHtml(d.note)}</p>
        </div>` : ""}
      ${emailP("This happens — the vulnerability was already reported. Continue searching for unique findings in this program.", true)}
      ${emailButton("View Report", url)}
    `,
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* 6. Reward approved (to RESEARCHER)                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
export function rewardApprovedEmail(d: RewardEmailData): string {
  const url = `${APP}/dashboard/researcher/rewards`;
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency", currency: d.currency, minimumFractionDigits: 0,
  }).format(d.amount);

  return emailBase({
    title:       `Reward approved: ${amount}`,
    previewText: `${d.orgName} approved a ${amount} reward for your report`,
    body: `
      ${emailH1("Reward approved 🎉")}
      ${emailP(`<strong style="color:#fafafa;">${escHtml(d.orgName)}</strong> has approved your reward. Payment will be processed shortly.`)}
      ${emailDivider()}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
        ${emailMeta("Report",  `<span style="color:#fafafa;">${escHtml(d.submissionTitle)}</span>`)}
        ${emailMeta("Program", escHtml(d.programName))}
        ${emailMeta("Amount",  `<span style="color:#2dd4bf;font-size:18px;font-weight:600;">${amount}</span>`)}
        ${emailMeta("Status",  emailBadge("APPROVED", "teal"))}
      </table>
      ${emailP("Check your earnings dashboard for payment details and timeline.", true)}
      ${emailButton("View Earnings", url)}
    `,
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* 7. Payout receipt (to RESEARCHER) — sent after a Stripe transfer succeeds  */
/* ─────────────────────────────────────────────────────────────────────────── */
export function payoutReceiptEmail(d: RewardEmailData & { transferId: string }): string {
  const url = `${APP}/dashboard/researcher/rewards`;
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency", currency: d.currency, minimumFractionDigits: 0,
  }).format(d.amount);

  return emailBase({
    title:       `Payout sent: ${amount}`,
    previewText: `${amount} has been transferred to your connected Stripe account`,
    body: `
      ${emailH1("Payout sent ✅")}
      ${emailP(`<strong style="color:#fafafa;">${amount}</strong> has been transferred to your connected Stripe account for your report to ${escHtml(d.orgName)}.`)}
      ${emailDivider()}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
        ${emailMeta("Report",      `<span style="color:#fafafa;">${escHtml(d.submissionTitle)}</span>`)}
        ${emailMeta("Program",     escHtml(d.programName))}
        ${emailMeta("Amount",      `<span style="color:#2dd4bf;font-size:18px;font-weight:600;">${amount}</span>`)}
        ${emailMeta("Transfer ID", `<span style="color:#71717a;font-family:monospace;font-size:12px;">${escHtml(d.transferId)}</span>`)}
        ${emailMeta("Status",      emailBadge("PAID", "green"))}
      </table>
      ${emailP("Funds typically arrive in your bank account within Stripe's standard payout schedule (usually 2-3 business days for standard payouts).", true)}
      ${emailButton("View Earnings", url)}
    `,
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* 8. Payout failed (to ORG OWNER) — admin alert, not researcher-facing       */
/* ─────────────────────────────────────────────────────────────────────────── */
export function payoutFailedEmail(d: {
  submissionTitle: string;
  researcherName:  string;
  amount:          number;
  currency:        string;
  reason:          string;
}): string {
  const url = `${APP}/dashboard/org/rewards`;
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency", currency: d.currency, minimumFractionDigits: 0,
  }).format(d.amount);

  return emailBase({
    title:       `Payout failed: ${amount}`,
    previewText: `A payout to ${d.researcherName} failed — action needed`,
    body: `
      ${emailH1("Payout failed ⚠️")}
      ${emailP(`A ${amount} payout to <strong style="color:#fafafa;">${escHtml(d.researcherName)}</strong> failed and was not delivered.`)}
      ${emailDivider()}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
        ${emailMeta("Report",  `<span style="color:#fafafa;">${escHtml(d.submissionTitle)}</span>`)}
        ${emailMeta("Amount",  amount)}
        ${emailMeta("Reason",  `<span style="color:#f87171;">${escHtml(d.reason)}</span>`)}
        ${emailMeta("Status",  emailBadge("FAILED", "red"))}
      </table>
      ${emailP("The reward remains approved and unpaid — retry from the rewards dashboard once the underlying issue is resolved.", true)}
      ${emailButton("View Rewards", url)}
    `,
  });
}

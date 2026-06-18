/**
 * VAULTX Email Client — powered by Resend
 * Free tier: 3,000 emails/month, 100/day
 *
 * All emails are fire-and-forget in server actions.
 * Never block user flow waiting for email delivery.
 */

export interface EmailPayload {
  to:       string | string[];
  subject:  string;
  html:     string;
  replyTo?: string;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@vaultx.io";
const API  = "https://api.resend.com/emails";

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email");
    return;
  }

  try {
    const res = await fetch(API, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        from:     `VAULTX <${FROM}>`,
        to:       Array.isArray(payload.to) ? payload.to : [payload.to],
        subject:  payload.subject,
        html:     payload.html,
        reply_to: payload.replyTo,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      console.error(`[Email] Send failed ${res.status}: ${err}`);
    }
  } catch (err) {
    // Non-fatal — log and continue
    console.error("[Email] Network error:", err);
  }
}

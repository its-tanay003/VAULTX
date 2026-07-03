/**
 * VAULTX Web Push Sender
 *
 * SERVER-ONLY. Sends native browser/OS push notifications via the
 * standard Web Push Protocol (VAPID). Never import this from a
 * Client Component.
 *
 * Design notes (mirrors lib/ai/claude.ts conventions):
 *   - Fire-and-forget: a push failure must never block or throw
 *     inside the calling notification event.
 *   - Bounded execution: each individual send is wrapped with a
 *     hard timeout so a hung push service can't stall a Cloudflare
 *     Workers invocation past its 30s ceiling.
 *   - Dead subscriptions (410 Gone / 404 Not Found — user revoked
 *     permission, uninstalled, or cleared browser data) are pruned
 *     from the DB automatically so we stop wasting requests on them.
 */

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:support@vaultx.io";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.error("[Push] VAPID keys not configured — skipping push send.");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body:  string;
  link?: string;   // relative URL, opened on notification click
  tag?:  string;   // collapses duplicate notifications (e.g. by entity_id)
}

/**
 * Sends a push notification to every subscription registered for a
 * user. Never throws — logs and continues on individual failures so
 * one dead subscription can't block delivery to the user's other
 * devices.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const supabase = createAdminClient();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", userId);

  if (error) {
    console.error("[Push] Failed to load subscriptions:", error.message);
    return;
  }
  if (!subs?.length) return; // user has no push subscriptions — nothing to do

  const body = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    link:  payload.link ?? "/dashboard",
    tag:   payload.tag,
  });

  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000); // 10s bound, matches AI client convention

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          body,
          { timeout: 10_000 }
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is dead — browser revoked it. Prune it.
          staleIds.push(sub.id);
        } else {
          console.error("[Push] Send failed:", err instanceof Error ? err.message : err);
        }
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/push/subscribe
 *
 * Called from components/notifications/push-toggle.tsx after the
 * browser grants Notification permission and PushManager.subscribe()
 * resolves. Upserts on (user_id, endpoint) so re-subscribing the same
 * browser (e.g. after key rotation) doesn't create duplicate rows.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const endpoint = body?.endpoint as string | undefined;
    const p256dh   = body?.keys?.p256dh as string | undefined;
    const authKey  = body?.keys?.auth as string | undefined;

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth_key: authKey,
          user_agent: request.headers.get("user-agent") ?? null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" }
      );

    if (error) {
      console.error("[Push Subscribe] Upsert failed:", error.message);
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[Push Subscribe] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/push/unsubscribe
 *
 * Called when the user disables the "Push notifications" toggle in
 * Settings, or when the browser's own subscription becomes invalid
 * client-side. Deletes by endpoint (scoped to the authenticated user
 * via RLS) rather than by id, since the client only ever has the
 * PushSubscription object, not our internal row id.
 */
export async function POST(request: Request) {
  try {
    const { validateCsrf } = await import("@/lib/api/csrf");
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const endpoint = body?.endpoint as string | undefined;

    if (!endpoint) {
      // No specific endpoint given — remove all of this user's
      // subscriptions (e.g. "disable push on all my devices").
      await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[Push Unsubscribe] Delete failed:", error.message);
      return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[Push Unsubscribe] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

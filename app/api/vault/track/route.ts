import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_EVENT_TYPES = new Set(["page_view", "action_taken", "search", "dismiss_suggestion"]);

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has opted out of AI personalization in profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("ai_personalization_opt_in, org_id")
      .eq("id", user.id)
      .single();

    if (profile?.ai_personalization_opt_in === false) {
      return NextResponse.json({ success: true, count: 0, optedOut: true });
    }

    const body = await request.json().catch(() => null);
    const rawEvents: Array<Record<string, unknown>> = Array.isArray(body?.events) ? body.events : [];

    if (rawEvents.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const rowsToInsert = rawEvents
      .filter((e: Record<string, unknown>) => typeof e?.eventType === "string" && ALLOWED_EVENT_TYPES.has(e.eventType as string))
      .slice(0, 50) // Cap max batch size
      .map((e: Record<string, unknown>) => ({
        user_id: user.id,
        org_id: profile?.org_id || null,
        event_type: e.eventType as string,
        capability_key: typeof e.capabilityKey === "string" ? (e.capabilityKey as string) : null,
        metadata: e.metadata && typeof e.metadata === "object" ? (e.metadata as Record<string, unknown>) : {},
        created_at: typeof e.timestamp === "string" ? (e.timestamp as string) : new Date().toISOString(),
      }));

    if (rowsToInsert.length > 0) {
      await supabase.from("user_behavior_events").insert(rowsToInsert);
    }

    return NextResponse.json({ success: true, count: rowsToInsert.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

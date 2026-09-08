import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/cron/personalization
 *
 * Nightly cron job to aggregate user behavior events into personalized profiles.
 * Calculates rolling top capabilities using frequency and recency weighting.
 * Zero external ML cost — uses SQL aggregation.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-vault-secret");
  if (secret !== process.env.VAULT_INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch distinct users with recent events
  const { data: recentEvents, error: eventsErr } = await supabase
    .from("user_behavior_events")
    .select("user_id, capability_key, event_type, created_at")
    .gte("created_at", thirtyDaysAgo)
    .not("capability_key", "is", null);

  if (eventsErr) {
    return NextResponse.json({ error: eventsErr.message }, { status: 500 });
  }

  if (!recentEvents || recentEvents.length === 0) {
    return NextResponse.json({ updatedUsersCount: 0, status: "no_recent_events" });
  }

  // 2. Aggregate events per user with recency decay
  // Recent events within 7 days get 2x weight, 7-14 days 1.5x, >14 days 1.0x
  const now = Date.now();
  const userScores: Record<string, Record<string, number>> = {};

  for (const ev of recentEvents) {
    if (!ev.capability_key || !ev.user_id) continue;

    if (!userScores[ev.user_id]) {
      userScores[ev.user_id] = {};
    }

    const eventTime = new Date(ev.created_at).getTime();
    const ageDays = (now - eventTime) / (1000 * 60 * 60 * 24);

    let weight = 1.0;
    if (ageDays <= 7) weight = 2.0;
    else if (ageDays <= 14) weight = 1.5;

    // Action taken gets higher weight than passive page view
    if (ev.event_type === "action_taken") weight *= 2.5;

    userScores[ev.user_id][ev.capability_key] =
      (userScores[ev.user_id][ev.capability_key] || 0) + weight;
  }

  let updatedCount = 0;

  for (const [userId, capScores] of Object.entries(userScores)) {
    // Sort and get top 5 capabilities
    const topCapabilities = Object.entries(capScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, score]) => ({ key, score: Math.round(score * 10) / 10 }));

    const { error: upsertErr } = await supabase
      .from("personalization_profiles")
      .upsert({
        user_id: userId,
        top_capabilities: topCapabilities,
        updated_at: new Date().toISOString(),
      });

    if (!upsertErr) updatedCount++;
  }

  return NextResponse.json({
    status: "success",
    updatedUsersCount: updatedCount,
    totalUsersProcessed: Object.keys(userScores).length,
  });
}

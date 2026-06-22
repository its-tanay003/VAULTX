import { NextResponse }    from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runRedTeamScan }  from "@/lib/ai/red-team";

/**
 * POST /api/red-team/run-scheduled-scans
 *
 * This is what makes "continuous" AI Red Team scanning actually true
 * instead of just a UI claim. Triggered by a GitHub Actions scheduled
 * workflow (.github/workflows/red-team-cron.yml) once daily — GitHub
 * Actions' free tier includes scheduled (cron) workflows, so this
 * costs nothing beyond the Claude API tokens spent on each scan.
 *
 * Scans every active target that hasn't been scanned in the last 20
 * hours (slight buffer under 24h so a daily cron doesn't drift past
 * the interval over time). Sequential, not parallel — intentional,
 * to stay comfortably under Claude API rate limits when an org has
 * many targets, and to keep GitHub API calls (60/hr unauthenticated
 * limit, per Week 6's design) from being exhausted by a burst.
 */
export async function POST(request: Request) {
  const internalSecret = request.headers.get("x-vault-secret");
  if (internalSecret !== process.env.VAULT_INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  const { data: targets, error } = await admin
    .from("red_team_targets")
    .select("id, name")
    .eq("is_active", true)
    .or(`last_scanned_at.is.null,last_scanned_at.lt.${cutoff}`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { targetId: string; name: string; success: boolean; error?: string }[] = [];

  for (const target of targets ?? []) {
    try {
      await runRedTeamScan(target.id);
      results.push({ targetId: target.id, name: target.name, success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ targetId: target.id, name: target.name, success: false, error: msg });
      console.error(`[Red Team Cron] Scan failed for ${target.name}: ${msg}`);
    }
  }

  return NextResponse.json({
    scannedCount: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}

/* Health check */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    description: "AI Red Team scheduled scan endpoint — triggered by GitHub Actions cron",
  });
}

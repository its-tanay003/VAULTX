import { NextResponse }  from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash, timingSafeEqual } from "crypto";

/**
 * POST /api/ctf/submit-flag
 *
 * This is a route handler (not a server action) because:
 *   1. Flag comparison must happen server-side — never send the
 *      correct flag hash to the client for client-side comparison
 *   2. Rate limiting needs request-level access (headers, IP) that
 *      server actions can't inspect directly
 *
 * SECURITY MODEL:
 *   - Flags stored as SHA-256 hashes in the DB (never plaintext)
 *   - Submission hashes the guess and compares hashes — correct
 *     flag can never be reverse-engineered from the DB
 *   - 5-attempt rate limit per challenge per researcher per minute
 *     enforced via ctf_wrong_attempts table + DB query
 *   - Duplicate solve detection via unique constraint on
 *     (challenge_id, researcher_id) in ctf_solves
 *
 * DYNAMIC POINTS (CTFd-style decay):
 *   points = max(min_points, base_points - (decay_factor * (solves - 1)))
 *   where decay_factor = (base_points - min_points) / 50
 *   This gives first blood full points, approaching min_points
 *   asymptotically as more teams solve.
 */
export async function POST(request: Request) {
  try {
    const { validateCsrf } = await import("@/lib/api/csrf");
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { challenge_id, flag } = body as { challenge_id?: string; flag?: string };

    if (!challenge_id || !flag?.trim()) {
      return NextResponse.json({ error: "challenge_id and flag are required" }, { status: 400 });
    }

    // Load challenge + competition
    const { data: challenge } = await supabase
      .from("ctf_challenges")
      .select("*, ctf_competitions(id, status, starts_at, ends_at, org_id)")
      .eq("id", challenge_id)
      .single();

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const competition = Array.isArray(challenge.ctf_competitions)
      ? challenge.ctf_competitions[0]
      : challenge.ctf_competitions;

    // Verify competition is currently active
    const now = new Date();
    if (competition?.status !== "active") {
      return NextResponse.json({ error: "This competition is not currently active" }, { status: 400 });
    }
    if (new Date(competition.starts_at) > now) {
      return NextResponse.json({ error: "Competition hasn't started yet" }, { status: 400 });
    }
    if (new Date(competition.ends_at) < now) {
      return NextResponse.json({ error: "Competition has ended" }, { status: 400 });
    }

    // Check for existing solve
    const { data: alreadySolved } = await supabase
      .from("ctf_solves")
      .select("id")
      .eq("challenge_id", challenge_id)
      .eq("researcher_id", user.id)
      .maybeSingle();

    if (alreadySolved) {
      return NextResponse.json({ error: "You already solved this challenge" }, { status: 400 });
    }

    // Rate limit: max 5 wrong attempts per minute per challenge per user
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentAttempts } = await supabase
      .from("ctf_wrong_attempts")
      .select("id", { count: "exact", head: true })
      .eq("challenge_id", challenge_id)
      .eq("researcher_id", user.id)
      .gte("attempted_at", oneMinuteAgo);

    if ((recentAttempts ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Too many attempts — wait 60 seconds before trying again" },
        { status: 429 }
      );
    }

    // Hash the submitted flag and compare
    const submittedHash = createHash("sha256").update(flag.trim()).digest("hex");
    
    // Use constant-time comparison to prevent timing attacks
    const correct = timingSafeEqual(
      Buffer.from(submittedHash, "hex"),
      Buffer.from(challenge.flag_hash, "hex")
    );

    if (!correct) {
      // Record wrong attempt for rate limiting
      await supabase.from("ctf_wrong_attempts").insert({
        challenge_id,
        researcher_id: user.id,
      });

      return NextResponse.json({
        correct: false,
        message: "Incorrect flag — keep trying!",
      });
    }

    // Correct! Compute dynamic points
    const currentSolves = challenge.solve_count ?? 0;
    const decayFactor   = (challenge.base_points - challenge.min_points) / 50;
    const points        = Math.max(
      challenge.min_points,
      Math.round(challenge.base_points - decayFactor * currentSolves)
    );
    const solvePosition = currentSolves + 1;

    // Insert solve (unique constraint handles race conditions)
    const { error: solveError } = await supabase.from("ctf_solves").insert({
      challenge_id,
      competition_id: competition.id,
      researcher_id: user.id,
      points_awarded: points,
      solve_position: solvePosition,
    });

    if (solveError) {
      if (solveError.code === "23505") {
        return NextResponse.json({ error: "You already solved this challenge" }, { status: 400 });
      }
      throw new Error(solveError.message);
    }

    // Award reputation points to researcher profile
    try {
      const { error: rpcError } = await supabase.rpc("increment_reputation", {
        p_user_id: user.id,
        p_amount:  Math.round(points / 10), // CTF solve = 1/10th of points as reputation
      });
      if (rpcError) throw rpcError;
    } catch {
      // RPC may not exist — update directly as fallback
      const { data } = await supabase.from("profiles")
        .select("reputation").eq("id", user.id).single();
      if (data) {
        await supabase.from("profiles")
          .update({ reputation: (data.reputation ?? 0) + Math.round(points / 10) })
          .eq("id", user.id);
      }
    }

    return NextResponse.json({
      correct:       true,
      points:        points,
      solvePosition,
      isFirstBlood:  solvePosition === 1,
      message:       solvePosition === 1
        ? `🩸 First blood! +${points} points`
        : `Correct! +${points} points`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[CTF Flag Submit]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

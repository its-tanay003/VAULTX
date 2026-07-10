import { NextResponse }        from "next/server";
import { validateSubmission }  from "@/lib/ai/validate";
import { createClient }        from "@/lib/supabase/server";
import { notifySubmissionReceived } from "@/lib/notifications/service";

/**
 * UPDATED app/api/ai/validate-submission/route.ts
 *
 * Adds: after AI validation completes, notify the org owner
 * that a new submission is ready for triage (now enriched with AI severity).
 *
 * This replaces Week 4's version — same auth logic, adds notification dispatch.
 */
export async function POST(request: Request) {
  try {
    const { validateCsrf } = await import("@/lib/api/csrf");
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    const body = await request.json().catch(() => ({}));
    const { submission_id: submissionId } = body as { submission_id?: string };

    if (!submissionId || typeof submissionId !== "string") {
      return NextResponse.json({ error: "submission_id is required" }, { status: 400 });
    }

    const internalSecret = request.headers.get("x-vault-secret");
    const isInternal     = internalSecret === process.env.VAULT_INTERNAL_SECRET;

    if (!isInternal) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      // Rate limit (e.g., max 15 validations per user per hour, fails-closed)
      const { checkApiRateLimit } = await import("@/lib/api/rate-limit");
      const rateLimitKey = `validate:${user.id}`;
      const rateCheck = await checkApiRateLimit(rateLimitKey, 15, true);
      if (!rateCheck.ok) {
        return NextResponse.json({ error: "Rate limit exceeded. Maximum 15 validation attempts per hour." }, { status: 429 });
      }

      const { data: sub } = await supabase
        .from("submissions").select("researcher_id, last_validated_at").eq("id", submissionId).single();
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();

      const isOwner = sub?.researcher_id === user.id;
      const isPriv  = ["triager", "admin"].includes(profile?.role ?? "");
      if (!isOwner && !isPriv) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Cooldown check (2 minutes)
      if (sub?.last_validated_at) {
        const elapsed = Date.now() - new Date(sub.last_validated_at).getTime();
        if (elapsed < 2 * 60 * 1000) {
          return NextResponse.json({ error: "Cooldown active. Please wait at least 2 minutes between validations." }, { status: 429 });
        }
      }

      // Update last_validated_at
      await supabase
        .from("submissions")
        .update({ last_validated_at: new Date().toISOString() })
        .eq("id", submissionId);
    }

    // Run the 3-stage validation pipeline
    const result = await validateSubmission(submissionId);

    // Notify org owner — fire and forget, after AI enrichment completes
    if (!result.error) {
      notifyOrgOfNewSubmission(submissionId).catch(console.error);
    }

    return NextResponse.json({
      success:      !result.error,
      submissionId: result.submissionId,
      severity:     result.severity.severity,
      confidence:   result.severity.confidence,
      isDuplicate:  result.duplicate.isDuplicate,
      duplicateId:  result.duplicate.duplicateId,
      processingMs: result.processingMs,
      error:        result.error,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[AI Validate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ─── Helper: notify org owner after AI enrichment ────────────────────────── */
async function notifyOrgOfNewSubmission(submissionId: string): Promise<void> {
  const supabase = createClient();

  const { data: sub } = await supabase
    .from("submissions")
    .select(`
      id, title, severity, ai_severity,
      programs!inner(id, name, org_id, organizations(owner_id)),
      profiles!submissions_researcher_id_fkey(full_name, username)
    `)
    .eq("id", submissionId)
    .single();

  if (!sub) return;

  const program    = Array.isArray(sub.programs) ? sub.programs[0] : sub.programs;
  const org        = Array.isArray(program?.organizations) ? program.organizations[0] : program?.organizations;
  const researcher = Array.isArray(sub.profiles) ? sub.profiles[0] : sub.profiles;

  if (!org?.owner_id) return;

  await notifySubmissionReceived({
    submissionId:    sub.id,
    submissionTitle: sub.title,
    programId:       program?.id ?? "",
    programName:     program?.name ?? "",
    severity:        sub.ai_severity ?? sub.severity, // prefer AI severity if available
    researcherName:  researcher?.full_name ?? researcher?.username ?? "A researcher",
    orgOwnerId:      org.owner_id,
  });
}

/* Health check */
export async function GET() {
  return NextResponse.json({
    status:    "ok",
    model:     "claude-sonnet-4-6",
    pipeline:  ["sha256_hash", "pg_trgm_fuzzy", "claude_semantic"],
    notifications: ["in_app", "email"],
    invariant: "AI cannot approve rewards",
  });
}

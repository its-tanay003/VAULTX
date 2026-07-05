import { authenticateApiKey, requireScope } from "@/lib/api/auth";
import { checkApiRateLimit } from "@/lib/api/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/utils";
import { triggerAIValidation } from "@/app/actions/ai-validation";
import type { SeverityLevel } from "@/lib/supabase/types";

/**
 * GET /api/v1/submissions
 * Scope: read:submissions
 * Lists the authenticated researcher's own submissions. Supports
 * ?limit= (default 20, max 100) and ?status= filtering.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  const scopeError = requireScope(auth, "read:submissions");
  if (scopeError) return scopeError;

  const rl = await checkApiRateLimit(auth!.keyId);
  if (!rl.ok) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });

  const url    = new URL(request.url);
  const limit  = Math.min(100, Number(url.searchParams.get("limit")) || 20);
  const status = url.searchParams.get("status");

  const supabase = createAdminClient();
  let query = supabase
    .from("submissions")
    .select("id, program_id, title, severity, status, ai_severity, ai_confidence, created_at, updated_at")
    .eq("researcher_id", auth!.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ data, count: data.length }, { headers: { "X-RateLimit-Remaining": String(rl.remaining) } });
}

/**
 * POST /api/v1/submissions
 * Scope: write:submissions
 * Creates a submission via the same 2-stage dedup pipeline (exact
 * SHA-256 + fuzzy pg_trgm) and AI validation trigger as the dashboard
 * form (app/actions/submissions.ts createSubmission) — this is a
 * parallel entry point into the identical pipeline, not a simplified
 * one, so API-submitted reports get the same duplicate detection and
 * AI triage as manually-submitted ones.
 */
export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  const scopeError = requireScope(auth, "write:submissions");
  if (scopeError) return scopeError;

  const rl = await checkApiRateLimit(auth!.keyId, 20); // tighter limit for writes
  if (!rl.ok) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = createAdminClient();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth!.userId).single();
  if (!profile || profile.role !== "researcher") {
    return Response.json({ error: "Only researcher accounts can submit reports" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

  const {
    program_id: programId,
    title,
    description,
    steps_to_reproduce: stepsToReproduce,
    impact,
    severity,
  } = body as Record<string, string>;

  if (!programId)        return Response.json({ error: "program_id is required" }, { status: 400 });
  if (!title || title.trim().length < 10)
    return Response.json({ error: "title is required and must be at least 10 characters" }, { status: 400 });
  if (!description)      return Response.json({ error: "description is required" }, { status: 400 });
  if (!stepsToReproduce) return Response.json({ error: "steps_to_reproduce is required" }, { status: 400 });
  const validSeverities: SeverityLevel[] = ["critical", "high", "medium", "low", "info"];
  if (!validSeverities.includes(severity as SeverityLevel))
    return Response.json({ error: `severity must be one of: ${validSeverities.join(", ")}` }, { status: 400 });

  const { data: program } = await supabase
    .from("programs").select("id, status").eq("id", programId).single();
  if (!program || program.status !== "active") {
    return Response.json({ error: "Program is not accepting submissions" }, { status: 400 });
  }

  const contentHash = await sha256(`${title}${description}`);

  const { data: exactDuplicate } = await supabase
    .from("submissions").select("id")
    .eq("program_id", programId).eq("content_hash", contentHash).maybeSingle();

  const { data: fuzzyMatches } = await supabase
    .rpc("find_similar_submissions", {
      p_program_id: programId, p_title: title, p_description: description, p_threshold: 0.4,
    })
    .limit(1);
  const fuzzyDuplicate = fuzzyMatches?.[0] ?? null;

  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      program_id:         programId,
      researcher_id:      auth!.userId,
      title:               title.trim(),
      description,
      steps_to_reproduce:  stepsToReproduce,
      impact:              impact ?? "",
      severity,
      status:              "new",
      content_hash:        contentHash,
      ai_duplicate_of:     exactDuplicate?.id ?? fuzzyDuplicate?.id ?? null,
      attachments:         [],
    })
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    actor_id: auth!.userId, action: "submission.created", entity: "submissions",
    entity_id: submission.id, after: { title, severity, program_id: programId, via: "public_api" },
  });

  triggerAIValidation(submission.id).catch(console.error);

  return Response.json({ data: { id: submission.id } }, { status: 201 });
}

/**
 * VAULTX AI Validation Engine
 *
 * 3-Stage Pipeline:
 *   Stage 1 — SHA-256 exact hash match       (zero API cost, instant)
 *   Stage 2 — pg_trgm fuzzy text search      (zero API cost, fast)
 *   Stage 3 — Claude semantic comparison     (API cost, only when stages 1+2 pass)
 *
 * Stage 3 only fires if Stage 2 finds similarity > 0.35.
 * This keeps Claude API costs near zero for low-signal submissions.
 */

import { createClient }          from "@/lib/supabase/server";
import { callClaude, parseJsonResponse, getTotalTokens } from "./claude";
import {
  buildDuplicatePrompt,
  buildSeverityPrompt,
  buildSummaryPrompt,
} from "./prompts";
import type {
  ValidationResult,
  Stage2Result,
  Stage3Result,
  SeverityResult,
  DuplicateResult,
} from "./types";
import type { SeverityLevel } from "@/lib/supabase/types";

/* ─── Main entry point ────────────────────────────────────────────────────── */

export async function validateSubmission(
  submissionId: string
): Promise<ValidationResult> {
  const startMs  = Date.now();
  const supabase = createClient();

  // Load submission
  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("*, programs(type)")
    .eq("id", submissionId)
    .single();

  if (subErr || !sub) {
    return errorResult(submissionId, "Submission not found", Date.now() - startMs);
  }

  const programType =
    (Array.isArray(sub.programs) ? sub.programs[0] : sub.programs)?.type ??
    "bug_bounty";

  try {
    // Run duplicate detection + severity in parallel
    const [duplicate, severity] = await Promise.all([
      runDuplicateDetection(sub, supabase),
      runSeverityClassification(sub, programType, supabase),
    ]);

    // Build human-readable summary
    let analysisText = `AI Severity: ${severity.severity} (${Math.round(severity.confidence * 100)}% confidence)\n`;
    analysisText    += `Reasoning: ${severity.reasoning}\n`;
    if (duplicate.isDuplicate) {
      analysisText += `\n⚠ Possible duplicate of submission ${duplicate.duplicateId} (stage ${duplicate.stage}, ${Math.round(duplicate.confidence * 100)}% confidence)`;
    }

    // Write results back to submission
    await supabase
      .from("submissions")
      .update({
        ai_severity:      severity.severity,
        ai_confidence:    severity.confidence,
        ai_duplicate_of:  duplicate.isDuplicate ? duplicate.duplicateId : null,
        ai_analysis:      analysisText,
        status:           duplicate.isDuplicate ? "triaging" : "triaging",
      })
      .eq("id", submissionId);

    // Immutable audit log
    await supabase.from("audit_logs").insert({
      actor_id:  null, // AI — no human actor
      action:    "ai.validation.complete",
      entity:    "submissions",
      entity_id: submissionId,
      after: {
        ai_severity:     severity.severity,
        ai_confidence:   severity.confidence,
        is_duplicate:    duplicate.isDuplicate,
        duplicate_stage: duplicate.stage,
        duplicate_id:    duplicate.duplicateId,
      },
    });

    const result: ValidationResult = {
      submissionId,
      duplicate,
      severity,
      analysisText,
      processingMs: Date.now() - startMs,
      error: null,
    };

    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown validation error";

    // Log failure — still immutable
    await supabase.from("audit_logs").insert({
      actor_id:  null,
      action:    "ai.validation.failed",
      entity:    "submissions",
      entity_id: submissionId,
      after:     { error: msg },
    });

    return errorResult(submissionId, msg, Date.now() - startMs);
  }
}

/* ─── Stage 1 + 2 + 3 Duplicate Detection ────────────────────────────────── */

async function runDuplicateDetection(
  sub: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
): Promise<DuplicateResult> {

  // Stage 1 — exact hash match (already checked on insert, re-verify here)
  const { data: exactMatch } = await supabase
    .from("submissions")
    .select("id")
    .eq("program_id",   sub.program_id as string)
    .eq("content_hash", sub.content_hash as string)
    .neq("id",          sub.id as string)
    .not("status", "in", '("rejected","wont_fix")')
    .maybeSingle();

  if (exactMatch) {
    return {
      isDuplicate: true,
      duplicateId: exactMatch.id,
      stage:       1,
      confidence:  1.0,
      reasoning:   "Exact content hash match — identical submission already exists",
    };
  }

  // Stage 2 — pg_trgm fuzzy match
  const { data: fuzzyMatches } = await supabase
    .rpc("find_similar_submissions", {
      p_program_id:  sub.program_id as string,
      p_title:       sub.title as string,
      p_description: sub.description as string,
      p_threshold:   0.35,
    })
    .limit(3);

  if (!fuzzyMatches || fuzzyMatches.length === 0) {
    return {
      isDuplicate: false,
      duplicateId: null,
      stage:       null,
      confidence:  0,
      reasoning:   "No similar submissions found",
    };
  }

  const topMatch = fuzzyMatches[0] as {
    id: string; title: string; combined_sim: number;
  };

  // If fuzzy sim > 0.75 — high enough to flag without Claude
  if (topMatch.combined_sim >= 0.75) {
    return {
      isDuplicate: true,
      duplicateId: topMatch.id,
      stage:       2,
      confidence:  topMatch.combined_sim,
      reasoning:   `High fuzzy text similarity (${Math.round(topMatch.combined_sim * 100)}%) to existing submission`,
    };
  }

  // Stage 3 — Claude semantic comparison (only when fuzzy found candidates)
  try {
    const stage3 = await runStage3(sub, fuzzyMatches, supabase);
    return stage3;
  } catch {
    // Stage 3 failed — fall back to stage 2 result at lower confidence
    return {
      isDuplicate: topMatch.combined_sim > 0.5,
      duplicateId: topMatch.combined_sim > 0.5 ? topMatch.id : null,
      stage:       2,
      confidence:  topMatch.combined_sim,
      reasoning:   "Fuzzy match (AI semantic check unavailable)",
    };
  }
}

async function runStage3(
  sub:          Record<string, unknown>,
  candidates:   Array<Record<string, unknown>>,
  supabase:     ReturnType<typeof createClient>
): Promise<DuplicateResult> {

  // Load full candidate details for semantic comparison
  const candidateIds = candidates.map((c) => c.id as string);
  const { data: fullCandidates } = await supabase
    .from("submissions")
    .select("id, title, description")
    .in("id", candidateIds);

  if (!fullCandidates?.length) {
    return { isDuplicate: false, duplicateId: null, stage: null, confidence: 0, reasoning: "No candidates loaded" };
  }

  const { system, user } = buildDuplicatePrompt({
    newTitle:       sub.title       as string,
    newDescription: sub.description as string,
    candidates:     fullCandidates.map((c, i) => ({
      id:          c.id,
      title:       c.title,
      description: c.description,
      similarity:  (candidates[i] as Record<string, number>)?.combined_sim ?? 0,
    })),
  });

  const message   = await callClaude({ system, user, maxTokens: 512 });
  const tokens    = getTotalTokens(message);

  const parsed = parseJsonResponse<{
    isDuplicate: boolean;
    duplicateId: string | null;
    similarity:  number;
    reasoning:   string;
  }>(message);

  return {
    isDuplicate: parsed.isDuplicate && !!parsed.duplicateId,
    duplicateId: parsed.isDuplicate ? parsed.duplicateId : null,
    stage:       3,
    confidence:  Math.min(1, Math.max(0, parsed.similarity)),
    reasoning:   parsed.reasoning,
  };
}

/* ─── Severity Classification ─────────────────────────────────────────────── */

async function runSeverityClassification(
  sub:         Record<string, unknown>,
  programType: string,
  _supabase:   ReturnType<typeof createClient>
): Promise<SeverityResult> {

  try {
    const { system, user } = buildSeverityPrompt({
      title:              sub.title             as string,
      description:        sub.description       as string,
      stepsToReproduce:   sub.steps_to_reproduce as string,
      impact:             sub.impact            as string,
      researcherSeverity: sub.severity          as SeverityLevel,
      programType:        programType           as "bug_bounty" | "vdp",
    });

    const message = await callClaude({ system, user, maxTokens: 512, temperature: 0.1 });
    const tokens  = getTotalTokens(message);

    const parsed = parseJsonResponse<{
      severity:   SeverityLevel;
      confidence: number;
      reasoning:  string;
      cvssHints:  string[];
    }>(message);

    const VALID_SEVERITIES: SeverityLevel[] = ["critical", "high", "medium", "low", "info"];
    if (!VALID_SEVERITIES.includes(parsed.severity)) {
      throw new Error(`Invalid severity: ${parsed.severity}`);
    }

    return {
      severity:   parsed.severity,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      reasoning:  parsed.reasoning ?? "",
      cvssHints:  Array.isArray(parsed.cvssHints) ? parsed.cvssHints : [],
      tokensUsed: tokens,
    };
  } catch {
    // Fallback: trust researcher's assessment with low confidence
    return {
      severity:   sub.severity as SeverityLevel,
      confidence: 0.4,
      reasoning:  "AI classification unavailable — researcher assessment used",
      cvssHints:  [],
      tokensUsed: 0,
    };
  }
}

/* ─── Error result factory ────────────────────────────────────────────────── */

function errorResult(
  submissionId: string,
  message:      string,
  processingMs: number
): ValidationResult {
  return {
    submissionId,
    duplicate: {
      isDuplicate: false,
      duplicateId: null,
      stage:       null,
      confidence:  0,
      reasoning:   "Validation failed",
    },
    severity: {
      severity:   "info",
      confidence: 0,
      reasoning:  "Validation failed",
      cvssHints:  [],
      tokensUsed: 0,
    },
    analysisText:  `Validation error: ${message}`,
    processingMs,
    error:         message,
  };
}

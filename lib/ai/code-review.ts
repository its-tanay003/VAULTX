/**
 * VAULTX Code Quality Scanner
 *
 * Reuses the Week 4 Claude client. Same injection-protection pattern:
 * all file content is wrapped in [DATA] blocks before being sent.
 *
 * Two independent passes feed into one result:
 *   1. AI review (this file's `callClaude` call) — security, performance,
 *      and quality issues that need contextual judgment.
 *   2. Static anti-pattern detection (lib/ai/anti-patterns.ts) — god
 *      objects, deep nesting, duplication, debug leftovers. Deterministic,
 *      zero AI cost, and runs even if the AI call fails outright.
 */

import { callClaude, parseJsonResponse } from "@/lib/ai/claude";
import { detectAntiPatterns } from "@/lib/ai/anti-patterns";
import type { RepoFile } from "@/lib/github/client";

export interface CodeFinding {
  file:     string;
  line:     number | null;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "security" | "performance" | "quality" | "anti-pattern";
  source?:  "ai" | "static"; // "ai" is the default/legacy value for existing scan records without this field
  message:  string;
}

export interface ScanResult {
  score:    number;       // 0–100
  summary:  string;
  findings: CodeFinding[];
}

function wrapUserData(content: string): string {
  const sanitized = content
    .replace(/\[\/DATA\]/gi, "[/DATA-BLOCKED]")
    .replace(/\[SYSTEM\]/gi, "[SYSTEM-BLOCKED]");
  return `[DATA]\n${sanitized}\n[/DATA]`;
}

export async function runCodeQualityScan(
  repoName: string,
  files:    RepoFile[]
): Promise<ScanResult> {
  if (files.length === 0) {
    return { score: 0, summary: "No scannable files found in this repository.", findings: [] };
  }

  const system = `You are a senior security engineer and code quality auditor reviewing a GitHub repository for a security platform called VAULTX.

Review the provided source files for:
- Security issues: hardcoded secrets/credentials, SQL injection risk, missing input validation, insecure crypto, auth bypass risk
- Performance anti-patterns: N+1 queries, blocking I/O in hot paths, unbounded loops, memory leaks
- Code quality issues: missing error handling, dead code, overly complex functions

Do NOT report structural anti-patterns like god objects, deep nesting, long parameter lists, duplicated code blocks, or debug leftovers (console.log/debugger) — a separate deterministic static analysis pass already covers those categories exhaustively. Focus your judgment on issues that require understanding intent and context, which pattern-matching can't catch.

Respond ONLY with valid JSON. No preamble, no markdown.

JSON schema:
{
  "score": number (0-100, overall code health — 100 is excellent),
  "summary": string (2-3 sentences, plain English, for a non-technical stakeholder),
  "findings": [
    {
      "file": string (exact file path as given),
      "line": number | null (best estimate, null if not line-specific),
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "category": "security" | "performance" | "quality",
      "message": string (max 150 chars, specific and actionable)
    }
  ]
}

Limit to the 10 most important findings. Be specific — cite real code patterns you observe, not generic advice.`;

  const fileBlock = files
    .map((f) => `=== FILE: ${f.path} ===\n${f.content}`)
    .join("\n\n");

  const user = `Repository: ${repoName}

Review these files:
${wrapUserData(fileBlock)}

Return JSON code quality assessment.`;

  // Static anti-pattern pass — deterministic, zero AI cost, computed first
  // so it's guaranteed to be available even if the AI call below fails
  // outright (both Claude and the Gemini fallback erroring).
  const antiPatternFindings = detectAntiPatterns(files);

  let aiFindings: CodeFinding[] = [];
  let aiScore = 70; // neutral fallback score when AI review is unavailable
  let summary = "AI review unavailable — showing static anti-pattern findings only.";

  try {
    const message = await callClaude({
      system,
      user,
      maxTokens:   2048,
      temperature: 0.1,
    });

    const parsed = parseJsonResponse<ScanResult>(message);
    aiFindings = (Array.isArray(parsed.findings) ? parsed.findings.slice(0, 10) : [])
      .map((f) => ({ ...f, source: "ai" as const }));
    aiScore = Math.min(100, Math.max(0, Math.round(parsed.score ?? 0)));
    summary = parsed.summary ?? "Scan completed.";
  } catch (err: unknown) {
    console.error("[CodeReview] AI pass failed, falling back to static-only results:", err);
  }

  // Small deduction for structural anti-patterns, same weighting scheme as
  // the Web3 auditor (severity-scaled, capped so anti-patterns alone can't
  // zero out an otherwise healthy scan).
  const antiPatternPenalty = antiPatternFindings.reduce((sum, f) => {
    const weight = { critical: 8, high: 5, medium: 3, low: 1, info: 0 }[f.severity] ?? 0;
    return sum + weight;
  }, 0);
  const finalScore = Math.max(0, aiScore - Math.min(20, antiPatternPenalty));

  return {
    score:    finalScore,
    summary,
    findings: [...aiFindings, ...antiPatternFindings],
  };
}

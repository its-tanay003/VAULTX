/**
 * VAULTX Code Quality Scanner
 *
 * Reuses the Week 4 Claude client. Same injection-protection pattern:
 * all file content is wrapped in [DATA] blocks before being sent.
 *
 * This is intentionally lightweight — a real anti-pattern/perf engine is
 * post-MVP. This module proves the concept: AI-assisted code review wired
 * into the same security platform that triages vulnerability reports.
 */

import { callClaude, parseJsonResponse } from "@/lib/ai/claude";
import type { RepoFile } from "@/lib/github/client";

export interface CodeFinding {
  file:     string;
  line:     number | null;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "security" | "performance" | "quality" | "anti-pattern";
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
- Anti-patterns: god objects, tight coupling, magic numbers, copy-pasted logic

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
      "category": "security" | "performance" | "quality" | "anti-pattern",
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

  const message = await callClaude({
    system,
    user,
    maxTokens:   2048,
    temperature: 0.1,
  });

  const parsed = parseJsonResponse<ScanResult>(message);

  // Validate and clamp
  return {
    score:    Math.min(100, Math.max(0, Math.round(parsed.score ?? 0))),
    summary:  parsed.summary ?? "Scan completed.",
    findings: Array.isArray(parsed.findings) ? parsed.findings.slice(0, 10) : [],
  };
}

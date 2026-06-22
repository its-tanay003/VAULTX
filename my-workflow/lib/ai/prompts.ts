/**
 * VAULTX AI Prompts
 *
 * PLATFORM INVARIANT #3:
 * All user-supplied text is wrapped in [DATA]...[/DATA] blocks.
 * This prevents prompt injection by framing user content as explicit data,
 * never as instructions. Never interpolate user text into system prompts directly.
 */

import type { SeverityLevel } from "@/lib/supabase/types";

/* ─── Shared safety wrapper ───────────────────────────────────────────────── */

function wrapUserData(content: string): string {
  // Strip any attempts to escape the data block
  const sanitized = content
    .replace(/\[\/DATA\]/gi, "[/DATA-BLOCKED]")
    .replace(/\[SYSTEM\]/gi, "[SYSTEM-BLOCKED]")
    .replace(/\[INST\]/gi,   "[INST-BLOCKED]")
    .trim();
  return `[DATA]\n${sanitized}\n[/DATA]`;
}

/* ─── Duplicate detection prompt ──────────────────────────────────────────── */

export interface DuplicatePromptInput {
  newTitle:       string;
  newDescription: string;
  candidates: Array<{
    id:          string;
    title:       string;
    description: string;
    similarity:  number;
  }>;
}

export function buildDuplicatePrompt(input: DuplicatePromptInput): {
  system: string;
  user:   string;
} {
  const system = `You are a security vulnerability deduplication expert for a bug bounty platform.

Your task: Determine whether a NEW submission is a semantic duplicate of any EXISTING submission.

Rules:
- A duplicate means the SAME vulnerability at the SAME location, even if described differently
- Different attack vectors to the same root cause = duplicates
- Same vulnerability type at DIFFERENT endpoints = NOT duplicates
- Superficially similar topics but different issues = NOT duplicates

Respond ONLY with valid JSON. No preamble, no markdown, no explanation outside JSON.

JSON schema:
{
  "isDuplicate": boolean,
  "duplicateId": string | null,
  "similarity": number (0.0 to 1.0),
  "reasoning": string (max 150 chars)
}`;

  const candidateBlock = input.candidates
    .map(
      (c, i) => `EXISTING[${i}] id=${c.id} trgm_sim=${c.similarity.toFixed(2)}
Title: ${c.title}
Description: ${c.description.slice(0, 400)}`
    )
    .join("\n\n");

  const user = `NEW SUBMISSION:
${wrapUserData(`Title: ${input.newTitle}\nDescription: ${input.newDescription.slice(0, 800)}`)}

EXISTING SUBMISSIONS TO COMPARE AGAINST:
${wrapUserData(candidateBlock)}

Compare the NEW SUBMISSION against each EXISTING submission and return JSON.`;

  return { system, user };
}

/* ─── Severity classification prompt ──────────────────────────────────────── */

export interface SeverityPromptInput {
  title:             string;
  description:       string;
  stepsToReproduce:  string;
  impact:            string;
  researcherSeverity:SeverityLevel;
  programType:       "bug_bounty" | "vdp";
}

export function buildSeverityPrompt(input: SeverityPromptInput): {
  system: string;
  user:   string;
} {
  const system = `You are a senior security engineer performing vulnerability triage for a bug bounty platform.

Classify vulnerability severity using CVSS v3.1 principles:
- critical: CVSS 9.0–10.0 — RCE, auth bypass at scale, mass data breach
- high:     CVSS 7.0–8.9  — significant data exposure, privilege escalation, SSRF
- medium:   CVSS 4.0–6.9  — limited scope XSS, CSRF, info disclosure
- low:      CVSS 1.0–3.9  — minor issues, rate limiting, self-XSS
- info:     CVSS 0.0–0.9  — best practice, informational

Respond ONLY with valid JSON. No preamble, no markdown.

JSON schema:
{
  "severity": "critical" | "high" | "medium" | "low" | "info",
  "confidence": number (0.0 to 1.0),
  "reasoning": string (max 200 chars — plain English, no jargon),
  "cvssHints": string[] (2–4 key CVSS factors)
}`;

  const user = `Classify the severity of this vulnerability report.
Researcher's self-assessment: ${input.researcherSeverity}
Program type: ${input.programType}

${wrapUserData(
  `Title: ${input.title}
Description: ${input.description.slice(0, 600)}
Steps to Reproduce: ${input.stepsToReproduce.slice(0, 400)}
Impact: ${input.impact.slice(0, 300)}`
)}

Return JSON severity classification.`;

  return { system, user };
}

/* ─── Summary prompt (for triager digest) ─────────────────────────────────── */

export function buildSummaryPrompt(input: {
  title:       string;
  description: string;
  steps:       string;
  impact:      string;
}): { system: string; user: string } {
  const system = `You are a security triage assistant. Produce a concise 2-sentence summary of a vulnerability report for a busy triager. Plain English. No jargon. Be specific about the vulnerability type and location.`;

  const user = `Summarize this vulnerability for a triager:
${wrapUserData(
  `Title: ${input.title}
Description: ${input.description.slice(0, 500)}
Impact: ${input.impact.slice(0, 300)}`
)}

Return exactly 2 sentences.`;

  return { system, user };
}

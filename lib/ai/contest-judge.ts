/**
 * AI-assisted duplicate detection for audit contest judging.
 *
 * The judging workflow: after a contest closes, the org judge reviews
 * all findings and marks each as valid/invalid/duplicate. This module
 * pre-groups semantically similar findings to make that human review
 * faster — the AI suggests groupings, the judge confirms them.
 *
 * Reuses the same multi-provider Claude+Gemini client from Week 11,
 * same [DATA] injection protection, same JSON-output discipline.
 */

import { callClaude, parseJsonResponse } from "@/lib/ai/claude";

export interface FindingForGrouping {
  id:          string;
  title:       string;
  description: string;
  severity:    string;
  affectedFiles?: string[];
}

export interface DuplicateGroup {
  rootFindingId: string;     // the finding that should be treated as the "original"
  duplicateIds:  string[];   // other findings that describe the same issue
  confidence:    number;
  reasoning:     string;
}

function wrapUserData(content: string): string {
  return `[DATA]\n${content.replace(/\[\/DATA\]/gi, "[/DATA-BLOCKED]").replace(/\[SYSTEM\]/gi, "[SYSTEM-BLOCKED]")}\n[/DATA]`;
}

export async function suggestDuplicateGroups(
  findings: FindingForGrouping[]
): Promise<DuplicateGroup[]> {
  if (findings.length < 2) return [];

  const system = `You are an expert smart contract / application security auditor judging an audit contest.

Your task: identify which submitted findings describe the SAME underlying vulnerability.

Duplicate criteria:
- Same root cause (not just same symptom)
- Same affected code location (same function, same contract)
- Different surface manifestations of the same bug are duplicates
- Similar vulnerability CLASS in different locations are NOT duplicates

For each duplicate group, identify the BEST submission as the root (clearest description, most detailed PoC, first submitted).

Respond ONLY with valid JSON. No preamble.

JSON schema:
{
  "groups": [
    {
      "rootFindingId": string,
      "duplicateIds": string[] (IDs of the OTHER findings that duplicate the root — NOT including the root itself),
      "confidence": number (0.0-1.0),
      "reasoning": string (max 100 chars — why these are duplicates)
    }
  ]
}

Only include findings where you're confident they're duplicates. If nothing is clearly duplicate, return { "groups": [] }. Never group findings that describe different vulnerabilities just because they're in the same file.`;

  const findingsBlock = findings
    .map((f) => `[ID:${f.id}] ${f.severity.toUpperCase()}: ${f.title}\n${f.description.slice(0, 300)}${f.affectedFiles?.length ? `\nFiles: ${f.affectedFiles.join(", ")}` : ""}`)
    .join("\n\n---\n\n");

  const user = `Contest findings to analyze for duplicates (${findings.length} total):

${wrapUserData(findingsBlock)}

Return JSON duplicate groups.`;

  try {
    const message = await callClaude({ system, user, maxTokens: 2048, temperature: 0.1 });
    const parsed  = parseJsonResponse<{ groups: DuplicateGroup[] }>(message);
    return Array.isArray(parsed.groups) ? parsed.groups : [];
  } catch {
    // Non-fatal — judge proceeds manually if AI unavailable
    return [];
  }
}

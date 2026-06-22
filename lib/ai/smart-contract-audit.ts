/**
 * VAULTX Web3 Smart Contract Audit Module
 *
 * Solidity-specific Claude+Gemini analysis (same multi-provider client
 * as every other AI module — the lib/ai/claude.ts retrofit from Week 11
 * applies here automatically since this imports from that same path).
 *
 * SCOPE OF ANALYSIS:
 * Static analysis only — we're reading Solidity source code the same
 * way a human auditor reads it before writing an exploit PoC. We don't
 * deploy contracts or call a live node. Every finding is a hypothesis
 * that requires a human auditor to verify. This is explicit in both
 * the UI copy and the finding descriptions injected into submissions.
 *
 * VULNERABILITY TAXONOMY:
 * Derived from the SWC Registry (smart-contract-weakness-classification)
 * and Trail of Bits' public research. Categories match what real audit
 * firms report — not invented or marketing terms.
 */

import { callClaude, parseJsonResponse, getTotalTokens } from "@/lib/ai/claude";
import type { RepoFile } from "@/lib/github/client";

export interface SmartContractFinding {
  swcId:       string | null; // SWC registry ID e.g. "SWC-107", null if not in registry
  category:    string;
  title:       string;
  description: string;
  severity:    "critical" | "high" | "medium" | "low" | "info";
  file:        string;
  line:        number | null;
  codeSnippet: string | null;
  recommendation: string;
}

export interface ContractAuditResult {
  score:       number;         // 0–100 security health score (100 = no issues found)
  summary:     string;
  findings:    SmartContractFinding[];
  contractsAnalyzed: string[];
  tokensUsed:  number;
}

function wrapUserData(content: string): string {
  return `[DATA]\n${content.replace(/\[\/DATA\]/gi, "[/DATA-BLOCKED]").replace(/\[SYSTEM\]/gi, "[SYSTEM-BLOCKED]")}\n[/DATA]`;
}

/* ─── Core audit prompt ────────────────────────────────────────────────────── */

export async function runSmartContractAudit(
  repoName: string,
  files:    RepoFile[]
): Promise<ContractAuditResult> {
  if (files.length === 0) {
    return {
      score: 0,
      summary: "No Solidity (.sol) files found in this repository.",
      findings: [],
      contractsAnalyzed: [],
      tokensUsed: 0,
    };
  }

  const system = `You are a senior smart contract security auditor with expertise in Solidity and EVM-based contracts. You have deep knowledge of the SWC (Smart Contract Weakness Classification) Registry and common DeFi attack patterns.

Perform a security-focused static analysis of the provided Solidity contracts. Think like an attacker: look for exploitable paths, not just code style.

VULNERABILITY CATEGORIES TO CHECK (systematic, in order of typical severity):
1. Reentrancy (SWC-107) — external calls before state updates, missing CEI pattern
2. Integer overflow/underflow (SWC-101) — unchecked arithmetic, missing SafeMath or Solidity 0.8+
3. Access control (SWC-105, SWC-106) — missing onlyOwner/role checks, tx.origin auth, constructor visibility
4. Oracle manipulation — price oracle reliance on single source, flash loan attack vectors
5. Front-running (SWC-114) — MEV-exploitable state changes, race conditions in commit-reveal
6. Denial of Service — block gas limit DoS, unexpected revert in loops, push-over-pull pattern
7. Timestamp dependence (SWC-116) — block.timestamp in critical logic
8. Unchecked return values (SWC-104) — low-level call() without return check
9. Delegatecall risk (SWC-112) — storage layout conflicts in proxy patterns
10. Hardcoded addresses, self-destruct vectors, insecure randomness (SWC-120)

SCORING:
- Start at 100.
- Critical: -25 per finding
- High: -15 per finding
- Medium: -8 per finding
- Low: -3 per finding
- Info: -0 (notes only, no deduction)
- Minimum score: 0

Respond ONLY with valid JSON. No preamble, no markdown.

JSON schema:
{
  "score": number (0-100),
  "summary": string (3-4 sentences, non-technical, suitable for a project owner),
  "contractsAnalyzed": string[] (list of contract names/file paths analyzed),
  "findings": [
    {
      "swcId": string | null (e.g. "SWC-107", null if no registry entry),
      "category": string (e.g. "Reentrancy", "Access Control"),
      "title": string (short, specific),
      "description": string (what the issue is and where — be concrete, cite real code patterns you see),
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "file": string (exact file path),
      "line": number | null,
      "codeSnippet": string | null (the problematic code, max 3 lines),
      "recommendation": string (specific fix, not generic advice)
    }
  ]
}

Maximum 15 findings, prioritized by severity. Cite actual code patterns you observe — do not invent vulnerabilities not visible in the provided source.`;

  const fileBlock = files
    .map((f) => `=== CONTRACT: ${f.path} ===\n${f.content}`)
    .join("\n\n");

  const user = `Repository: ${repoName}
Solidity files to audit: ${files.length}

${wrapUserData(fileBlock)}

Return JSON smart contract security audit.`;

  const message = await callClaude({
    system,
    user,
    maxTokens:   3000,
    temperature: 0.1, // lower temperature for security analysis — want consistent, not creative
  });

  const tokens = getTotalTokens(message);
  const parsed = parseJsonResponse<ContractAuditResult>(message);

  // Clamp + validate
  return {
    score:             Math.min(100, Math.max(0, Math.round(parsed.score ?? 0))),
    summary:           parsed.summary ?? "Audit completed.",
    contractsAnalyzed: Array.isArray(parsed.contractsAnalyzed) ? parsed.contractsAnalyzed : files.map((f) => f.path),
    findings:          Array.isArray(parsed.findings) ? parsed.findings.slice(0, 15) : [],
    tokensUsed:        tokens,
  };
}

/**
 * VAULTX Anti-Pattern Detector (static analysis)
 *
 * Distinct from the AI-driven code-review.ts pass. This runs zero-cost,
 * deterministic pattern rules over raw source text — no AI call, no
 * token cost, instant, and fully explainable (every finding maps to an
 * exact rule, not a model's judgment call).
 *
 * Why a separate module instead of just asking the AI harder:
 *   - The original AI review prompt lumps security/performance/quality/
 *     anti-pattern findings into one capped top-10 list — anti-patterns
 *     routinely got crowded out by security findings.
 *   - Structural issues (god objects, deep nesting, duplication) are
 *     mechanically detectable and don't need a model call to find —
 *     spending AI budget on them is wasteful when a regex will do.
 *   - Deterministic findings are reproducible: the same file always
 *     produces the same result, which the AI pass doesn't guarantee.
 *
 * These findings are merged with the AI pass in runCodeQualityScan()
 * (lib/ai/code-review.ts), tagged `source: "static"` so the UI can
 * distinguish "a rule caught this" from "the model judged this."
 */

import type { RepoFile } from "@/lib/github/client";
import type { CodeFinding } from "@/lib/ai/code-review";

const MAX_FINDINGS = 10;

/* ─── Rule 1: God object / oversized file ─────────────────────────────────── */
function detectLargeFiles(file: RepoFile): CodeFinding[] {
  const lineCount = file.content.split("\n").length;
  if (lineCount <= 400) return [];

  return [{
    file:     file.path,
    line:     null,
    severity: lineCount > 800 ? "high" : "medium",
    category: "anti-pattern",
    source:   "static",
    message:  `File is ${lineCount} lines — likely a god object/module doing too much. Consider splitting by responsibility.`,
  }];
}

/* ─── Rule 2: Deep nesting ─────────────────────────────────────────────────── */
function detectDeepNesting(file: RepoFile): CodeFinding[] {
  const lines = file.content.split("\n");
  const findings: CodeFinding[] = [];
  let maxDepth = 0;
  let maxDepthLine = 0;

  lines.forEach((line, i) => {
    const leading = line.match(/^[ \t]*/)?.[0] ?? "";
    const depth = leading.includes("\t")
      ? leading.length
      : Math.floor(leading.length / 2); // assume 2-space indent as baseline unit
    if (depth > maxDepth && line.trim().length > 0) {
      maxDepth = depth;
      maxDepthLine = i + 1;
    }
  });

  if (maxDepth >= 12) { // ~6 levels of 2-space nesting
    findings.push({
      file:     file.path,
      line:     maxDepthLine,
      severity: "medium",
      category: "anti-pattern",
      source:   "static",
      message:  `Deep nesting detected (~${Math.round(maxDepth / 2)} levels) — consider early returns or extracting helper functions.`,
    });
  }
  return findings;
}

/* ─── Rule 3: Empty catch / bare except (swallowed errors) ────────────────── */
function detectSwallowedErrors(file: RepoFile): CodeFinding[] {
  const findings: CodeFinding[] = [];
  const lines = file.content.split("\n");
  const jsEmptyCatch = /catch\s*\([^)]*\)\s*{\s*}/;
  const pyBarePass   = /except\s*[^:]*:\s*$/;

  lines.forEach((line, i) => {
    if (jsEmptyCatch.test(line)) {
      findings.push({
        file: file.path, line: i + 1, severity: "medium", category: "anti-pattern", source: "static",
        message: "Empty catch block silently swallows errors — at minimum log the exception.",
      });
    }
    if (pyBarePass.test(line) && lines[i + 1]?.trim() === "pass") {
      findings.push({
        file: file.path, line: i + 1, severity: "medium", category: "anti-pattern", source: "static",
        message: "Bare except with only `pass` silently swallows errors.",
      });
    }
  });
  return findings;
}

/* ─── Rule 4: Long parameter lists ─────────────────────────────────────────── */
function detectLongParameterLists(file: RepoFile): CodeFinding[] {
  const findings: CodeFinding[] = [];
  const lines = file.content.split("\n");
  const sigPattern = /(?:function\s+\w+|def\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\()\s*\(([^)]*)\)/;

  lines.forEach((line, i) => {
    const match = line.match(sigPattern);
    if (!match) return;
    const params = match[1].split(",").map((p) => p.trim()).filter(Boolean);
    if (params.length > 5) {
      findings.push({
        file: file.path, line: i + 1, severity: "low", category: "anti-pattern", source: "static",
        message: `Function takes ${params.length} parameters — consider grouping into a single options/config object.`,
      });
    }
  });
  return findings;
}

/* ─── Rule 5: Debug leftovers ──────────────────────────────────────────────── */
function detectDebugLeftovers(file: RepoFile): CodeFinding[] {
  const patterns = [/console\.log\(/, /\bdebugger\b/, /\bpdb\.set_trace\(\)/];
  const lines = file.content.split("\n");
  let count = 0;
  let firstLine = 0;

  lines.forEach((line, i) => {
    if (patterns.some((p) => p.test(line))) {
      count++;
      if (!firstLine) firstLine = i + 1;
    }
  });

  if (count >= 3) {
    return [{
      file: file.path, line: firstLine, severity: "low", category: "anti-pattern", source: "static",
      message: `${count} debug statements (console.log/debugger) left in source — strip before production.`,
    }];
  }
  return [];
}

/* ─── Rule 6: TODO/FIXME density ───────────────────────────────────────────── */
function detectTodoDensity(file: RepoFile): CodeFinding[] {
  const matches = file.content.match(/\b(TODO|FIXME|HACK|XXX)\b/g);
  if (!matches || matches.length < 5) return [];

  return [{
    file: file.path, line: null, severity: "info", category: "anti-pattern", source: "static",
    message: `${matches.length} TODO/FIXME/HACK markers — high volume suggests accumulating tech debt.`,
  }];
}

/* ─── Rule 7: Duplicated code blocks (cross-file) ──────────────────────────── */
function detectDuplicateBlocks(files: RepoFile[]): CodeFinding[] {
  const WINDOW = 5;        // lines per block
  const MIN_LINE_LEN = 20; // skip trivial/blank-heavy windows
  const seen = new Map<string, { file: string; line: number }>();
  const findings: CodeFinding[] = [];
  const flaggedPairs = new Set<string>();

  for (const file of files) {
    const lines = file.content.split("\n").map((l) => l.trim());

    for (let i = 0; i <= lines.length - WINDOW; i++) {
      const block = lines.slice(i, i + WINDOW);
      const normalized = block.join("\n");
      if (normalized.replace(/\s/g, "").length < MIN_LINE_LEN) continue;
      if (block.some((l) => l.length === 0)) continue; // skip windows spanning blank gaps

      const key = normalized;
      const prior = seen.get(key);

      if (prior) {
        const pairKey = `${prior.file}:${prior.line}->${file.path}:${i + 1}`;
        if (!flaggedPairs.has(pairKey) && findings.length < MAX_FINDINGS) {
          flaggedPairs.add(pairKey);
          findings.push({
            file: file.path,
            line: i + 1,
            severity: "low",
            category: "anti-pattern",
            source: "static",
            message: `${WINDOW}-line block duplicated from ${prior.file}:${prior.line} — consider extracting a shared function.`,
          });
        }
      } else {
        seen.set(key, { file: file.path, line: i + 1 });
      }
    }
  }
  return findings;
}

/* ─── Runner ────────────────────────────────────────────────────────────────── */
export function detectAntiPatterns(files: RepoFile[]): CodeFinding[] {
  const perFileRules = [
    detectLargeFiles,
    detectDeepNesting,
    detectSwallowedErrors,
    detectLongParameterLists,
    detectDebugLeftovers,
    detectTodoDensity,
  ];

  const findings: CodeFinding[] = [];
  for (const file of files) {
    for (const rule of perFileRules) {
      findings.push(...rule(file));
    }
  }
  findings.push(...detectDuplicateBlocks(files));

  // Severity-first ordering, then cap — same convention as the AI pass.
  const severityOrder = ["critical", "high", "medium", "low", "info"];
  findings.sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  return findings.slice(0, MAX_FINDINGS);
}

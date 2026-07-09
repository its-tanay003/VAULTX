#!/usr/bin/env node
/**
 * VAULTX Bundle Size Budget Check (v2 — fixed)
 *
 * v1 tried to recompute "First Load JS" from raw .next/app-build-manifest.json
 * file lists, summing every JS file referenced per route. That double-counted
 * shared/framework chunks that Next's own build output correctly dedupes —
 * verified by running this against a real build: it flagged EVERY route,
 * including a 237-byte static page, as ~3x over budget, while Next's own
 * build output correctly reported that same page at 96.5 KB. Found by
 * actually running the script against real build output, not by reading
 * the code — the bug wasn't visible without execution.
 *
 * Fix: don't reimplement Next's First Load JS algorithm. Parse Next's own
 * build output table, which already computes this number correctly, and
 * apply budgets against that. Reads from a log file path (first CLI arg)
 * or stdin, since `next build`'s route table is printed to stdout, not
 * written to any manifest file.
 */

const fs = require("fs");

const BUDGETS_KB = {
  default: 300,
  "/dashboard": 220,
  "/dashboard/ptaas/[id]": 350, // pdf-lib pulled in for the report panel
};

function budgetFor(route) {
  for (const [key, kb] of Object.entries(BUDGETS_KB)) {
    if (key !== "default" && route.includes(key)) return kb;
  }
  return BUDGETS_KB.default;
}

/** Parses a size string like "5.91 kB" or "237 B" into kilobytes. */
function parseSizeToKb(sizeStr) {
  const match = sizeStr.match(/^([\d.]+)\s*(B|kB|MB)$/);
  if (!match) return null;
  const [, num, unit] = match;
  const value = parseFloat(num);
  if (unit === "B") return value / 1024;
  if (unit === "MB") return value * 1024;
  return value; // kB
}

function main() {
  const logPath = process.argv[2];
  const input = logPath ? fs.readFileSync(logPath, "utf8") : fs.readFileSync(0, "utf8");

  // Matches lines like: "├ ƒ /dashboard/org/reports    5.91 kB    209 kB"
  // Only page routes (start with /) — API routes report "0 B" for both
  // columns since they have no client bundle, and are skipped.
  const routeLineRe = /^[┌├└]\s+[○ƒ]\s+(\/\S*)\s+([\d.]+\s*(?:B|kB|MB))\s+([\d.]+\s*(?:B|kB|MB))/;

  const rows = [];
  let failed = false;

  for (const line of input.split("\n")) {
    const match = line.match(routeLineRe);
    if (!match) continue;

    const [, route, , firstLoadStr] = match;
    const firstLoadKb = parseSizeToKb(firstLoadStr);
    if (firstLoadKb === null || firstLoadKb === 0) continue; // API routes, skip

    const budget = budgetFor(route);
    const overBudget = firstLoadKb > budget;
    if (overBudget) failed = true;

    rows.push({ route, kb: Math.round(firstLoadKb), budget, overBudget });
  }

  if (rows.length === 0) {
    console.error("No route table found in build output — did `next build` run first and produce its usual route summary?");
    process.exit(1);
  }

  rows.sort((a, b) => b.kb - a.kb);

  console.log("\nRoute First Load JS vs budget (numbers from Next.js's own build output):\n");
  for (const r of rows) {
    const flag = r.overBudget ? "❌ OVER" : "✅";
    console.log(`  ${flag}  ${r.route.padEnd(55)} ${String(r.kb).padStart(4)} KB / ${r.budget} KB`);
  }
  console.log("");

  if (failed) {
    console.error("Bundle size budget exceeded — see routes marked OVER above.");
    console.error("Either reduce the route's client-side dependencies, or if the increase is");
    console.error("justified, update the budget in scripts/check-bundle-size.js with a comment.");
    process.exit(1);
  }

  console.log("All routes within budget.");
}

main();

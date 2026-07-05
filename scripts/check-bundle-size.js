#!/usr/bin/env node
/**
 * VAULTX Bundle Size Budget Check
 *
 * Parses the JSON build manifest Next.js writes to `.next/` and fails
 * CI if any route's First Load JS exceeds budget. Runs against every
 * route the build produces — unlike the Lighthouse step (which is
 * limited to unauthenticated pages a CI runner can actually render),
 * this is pure static analysis of build output, so it covers
 * authenticated dashboard routes too.
 *
 * Budgets are intentionally generous for a security dashboard with
 * charts/tables (recharts, etc.) but still catch genuine regressions
 * like an accidentally-bundled server-only dependency or an
 * unnecessarily large client component.
 */

const fs = require("fs");
const path = require("path");

const BUDGETS_KB = {
  default: 300,                 // most routes
  "/dashboard": 220,            // simpler shell routes should stay lean
  "/(dashboard)/dashboard/ptaas/[id]": 350, // pdf-lib pulled in for the report panel
};

const NEXT_DIR = path.join(process.cwd(), ".next");

function loadAppBuildManifest() {
  const manifestPath = path.join(NEXT_DIR, "app-build-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`Build manifest not found at ${manifestPath} — did the build step run first?`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function fileSizeKb(relPath) {
  const full = path.join(NEXT_DIR, relPath);
  if (!fs.existsSync(full)) return 0;
  return fs.statSync(full).size / 1024;
}

function budgetFor(route) {
  for (const [key, kb] of Object.entries(BUDGETS_KB)) {
    if (key !== "default" && route.includes(key)) return kb;
  }
  return BUDGETS_KB.default;
}

function main() {
  const manifest = loadAppBuildManifest();
  const pages = manifest.pages ?? {};

  let failed = false;
  const rows = [];

  for (const [route, files] of Object.entries(pages)) {
    const totalKb = (files || [])
      .filter((f) => f.endsWith(".js"))
      .reduce((sum, f) => sum + fileSizeKb(f), 0);

    const budget = budgetFor(route);
    const overBudget = totalKb > budget;
    if (overBudget) failed = true;

    rows.push({ route, totalKb: Math.round(totalKb), budget, overBudget });
  }

  rows.sort((a, b) => b.totalKb - a.totalKb);

  console.log("\nRoute First Load JS vs budget:\n");
  for (const r of rows) {
    const flag = r.overBudget ? "❌ OVER" : "✅";
    console.log(`  ${flag}  ${r.route.padEnd(55)} ${String(r.totalKb).padStart(4)} KB / ${r.budget} KB`);
  }
  console.log("");

  if (failed) {
    console.error("Bundle size budget exceeded — see routes marked OVER above.");
    console.error("Either reduce the route's client-side dependencies, or if the increase is");
    console.error("justified (a new feature that genuinely needs the weight), update the budget");
    console.error("in scripts/check-bundle-size.js with a comment explaining why.");
    process.exit(1);
  }

  console.log("All routes within budget.");
}

main();

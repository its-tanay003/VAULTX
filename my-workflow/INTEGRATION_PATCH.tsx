/* ════════════════════════════════════════════════════════════════════════
   INTEGRATION PATCH — Week 12 (Web3 Smart Contract Audits)
   ════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────────────
   Migration
   ────────────────────────────────────────────────────────────────────────── */

// Run 009_web3_audit.sql after 001-008. It adds a scan_type column to
// the existing code_scans table. Existing scan rows will default to
// 'general' automatically — no data migration needed.


/* ──────────────────────────────────────────────────────────────────────────
   FULL DROP-IN REPLACEMENTS
   ────────────────────────────────────────────────────────────────────────── */

// lib/github/client.ts
//   — fetchRepoTree() now accepts an optional extensions param.
//     Calling without it defaults to the original Week 6 extension list,
//     so the existing code quality module (lib/ai/code-review.ts) still
//     works unchanged. Just overwrite the Week 6 file.

// app/actions/code-quality.ts
//   — Adds runWeb3Audit(). The original connectRepo(), disconnectRepo(),
//     and runScan() are unchanged in behaviour. Full drop-in.

// app/(dashboard)/dashboard/code-quality/[id]/page.tsx
//   — Replaces the Week 6 single-scan view with a dual-tab layout:
//     "Code Quality" (general scan) and "Web3 Audit" (smart contract),
//     shown side by side when both have been run. Replaces Week 6 file.


/* ──────────────────────────────────────────────────────────────────────────
   NEW FILES
   ────────────────────────────────────────────────────────────────────────── */

// lib/ai/smart-contract-audit.ts   — Solidity-specific audit prompt + parser
// components/code-quality/web3-audit-button.tsx  — trigger UI component


/* ──────────────────────────────────────────────────────────────────────────
   Architecture decisions
   ────────────────────────────────────────────────────────────────────────── */

// 1. REUSES code_repos/code_scans TABLES, not parallel infrastructure.
//    A Web3 audit is a new scan type on the same connected repo, not a
//    new module or new tables — one scan_type column addition is the
//    entire schema change. This keeps the data model simple and means
//    the code quality list page, repo detail page, and all existing RLS
//    policies cover Web3 audits automatically.

// 2. SOLIDITY-ONLY FILE FILTER. fetchRepoTree() with extensions=[".sol"]
//    ensures only .sol files go to the audit prompt — no wasted tokens
//    on README, tests, or config files. selectPrioritySolidityFiles()
//    further prioritizes contracts with names matching common high-risk
//    patterns (vault, treasury, pool, swap, proxy, oracle, governance).

// 3. SWC REGISTRY IDs in findings. Every finding includes the Smart
//    Contract Weakness Classification registry ID where applicable
//    (e.g. SWC-107 for reentrancy) — this is what real audit firms
//    use and makes findings immediately cross-referenceable with
//    published research and Certik/Trail of Bits reports.

// 4. STATIC ANALYSIS ONLY — this is stated explicitly in the UI and
//    injected into every finding description. We do not deploy
//    contracts, call a live node, or execute any transactions. Every
//    finding is a code-reading hypothesis requiring a human auditor to
//    verify. This is honest and appropriate for a zero-cost toolchain.

// 5. MULTI-AI via Week 11's lib/ai/claude.ts retrofit applies here too.
//    No additional changes needed — smart-contract-audit.ts imports
//    callClaude() from the same path, so Gemini fallback is automatic.


/* ──────────────────────────────────────────────────────────────────────────
   Testing checklist
   ────────────────────────────────────────────────────────────────────────── */

// [ ] Connect a real public Solidity repo (e.g. https://github.com/
//     OpenZeppelin/openzeppelin-contracts or any small DeFi project)
// [ ] Run a Web3 Audit — confirm the audit panel shows with a score,
//     summary, and structured findings with SWC IDs
// [ ] Confirm each finding shows: severity badge, SWC ID, category,
//     title, description, code snippet (where available), file path,
//     and a concrete recommendation
// [ ] Run a general code quality scan on the same repo — confirm the
//     tab switcher appears and both results are navigable without re-scan
// [ ] Connect a non-Solidity repo and run a Web3 Audit — confirm the
//     "No .sol files found" error message appears cleanly rather than
//     an unhandled exception
// [ ] Confirm the code quality LIST page (/dashboard/code-quality)
//     still shows the repo and its last_scanned_at date correctly after
//     a Web3 audit (it reads last_scanned_at from code_repos, which
//     both scan types update — no change needed there)

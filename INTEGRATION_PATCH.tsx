/* ════════════════════════════════════════════════════════════════════════
   INTEGRATION PATCH — Week 14 (Code4rena-Style Audit Contests)
   ════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────────────
   Migration — run after 001-010
   ────────────────────────────────────────────────────────────────────────── */

// Run 011_audit_contests.sql.
// The set_updated_at() function this migration references was created in
// 007_ptaas.sql — confirm that migration ran first.


/* ──────────────────────────────────────────────────────────────────────────
   Sidebar — add Contests nav item
   ────────────────────────────────────────────────────────────────────────── */

// Add to ORG_NAV and RESEARCHER_NAV in sidebar.tsx and mobile-sidebar.tsx:
//   { href: "/dashboard/contests", icon: Scale, label: "Contests" }
// Import Scale from "lucide-react".


/* ──────────────────────────────────────────────────────────────────────────
   Architecture decisions
   ────────────────────────────────────────────────────────────────────────── */

// 1. DUPLICATE FINDINGS SPLIT REWARDS, NOT GET EXCLUDED.
//    This is the defining mechanic of Code4rena-style auditing.
//    Three auditors finding the same critical bug each get
//    10/3 = 3.33 shares instead of 10 shares. All three are
//    paid — the incentive to submit unique findings is preserved
//    (unique = full shares) but submitting duplicates still
//    earns partial credit (better than excluding them, which
//    would create a strategic game of "should I submit this or
//    wait to see if it's unique?").

// 2. POOL DISTRIBUTION FORMULA (lib/ai/contest-distribution.ts):
//    shares(finding) = severity_weight / duplicate_group_size
//    payout(finding) = (shares / total_shares) * pool_amount
//    This is a pure deterministic function with no AI involved —
//    correct by construction, auditable, no randomness.

// 3. AI ASSISTS JUDGING, DOESN'T REPLACE IT.
//    AIDuplicatePanel calls suggestDuplicateGroups() which uses
//    the same Claude+Gemini multi-provider client from Week 11.
//    It returns suggested groupings that the human judge applies
//    manually via the JudgePanel UI — the AI cannot directly mark
//    findings as duplicates, it can only suggest. Same human-in-
//    the-loop principle as Invariant #1 (AI cannot approve rewards).

// 4. JUDGING GATE BEFORE FINALIZATION.
//    finalizeContest() refuses to run if any finding is still in
//    "submitted" status. This is enforced in the server action,
//    not just the UI — the FinalizeButton is also disabled, but
//    a direct API call would also fail. The gate prevents
//    accidentally distributing a pool while some findings are
//    unjudged (which would silently exclude them from payout).

// 5. PAYOUT AMOUNTS WRITTEN TO contest_findings.payout_amount.
//    This means auditors can see their exact payout on the
//    submission page without a join to contest_payouts — cleaner
//    display without extra queries.

// 6. SEPARATE FROM bug bounty SUBMISSIONS TABLE (same reasoning
//    as CTF, Week 13). Audit contest findings have a judging
//    lifecycle and pool-based payout model that would break
//    the bug bounty triage queue's RLS, dedup, and notification
//    logic if mixed in. Future: a "promote to formal bug report"
//    button could bridge the two for critical findings.


/* ──────────────────────────────────────────────────────────────────────────
   Testing checklist
   ────────────────────────────────────────────────────────────────────────── */

// [ ] Create a contest, set to open, submit 4 findings as two
//     different researcher accounts: 1 critical (unique), 1 high
//     (shared by both researchers), 1 medium (unique), 1 info
// [ ] Move contest to "judging", open the judge page
// [ ] Click "Detect Duplicates" — confirm AI correctly identifies
//     the shared high-severity finding as a duplicate group
// [ ] Judge: mark the critical as valid/unique, mark both high
//     findings as valid/duplicate (one as root, one as duplicate_of
//     the root), mark medium as valid/unique, mark info as valid/unique
// [ ] Click "Finalize Distribution" — confirm it runs
// [ ] Open the contest detail page — verify the PayoutTable shows:
//     - Researcher A (critical unique = 10 shares + medium unique = 2 shares + high/2 = 2.5 shares = 14.5)
//     - Researcher B (high/2 = 2.5 shares + info = 0 shares = 2.5)
//     - Total shares = 17, pool distributed proportionally
// [ ] Confirm info finding shows $0 payout (weight=0)
// [ ] Try to finalize a second time — confirm it errors or is
//     blocked (contest already "complete")
// [ ] Verify pool remainder line appears if info finding left
//     some pool unallocated

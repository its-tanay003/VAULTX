/* ════════════════════════════════════════════════════════════════════════
   INTEGRATION PATCH — Week 11 (AI Red Team + Multi-AI Provider Retrofit)
   ════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────────────
   THE BIG ONE: lib/ai/claude.ts — FULL DROP-IN REPLACEMENT
   ────────────────────────────────────────────────────────────────────────── */

// This single file replacement retroactively gives MULTI-PROVIDER
// FALLBACK to every AI-powered module already built across the whole
// platform — Week 4 submission validation, Week 6 code quality, Week 10
// PTaaS test plans/reports, and this week's AI Red Team scans. None of
// those four files need any changes — they all import callClaude(),
// parseJsonResponse(), getTotalTokens() from this exact path, and the
// function signatures are unchanged. Just overwrite the file.
//
// New env var required: GEMINI_API_KEY (free, from https://aistudio.google.com/apikey)
// Add it alongside ANTHROPIC_API_KEY wherever that's already set —
// locally in .env.local AND in Cloudflare Pages production env vars.
//
// This is now the STANDING PATTERN for all future AI work on this
// project: every new AI integration goes through this multi-provider
// client, not a direct fetch() to one vendor's API.


/* ──────────────────────────────────────────────────────────────────────────
   FILE: components/layout/sidebar.tsx
   ────────────────────────────────────────────────────────────────────────── */

// AI Red Team is no longer a stub. Move it from STUB_MODULES into the
// real ORG_NAV array (it's org-only — see the page component's redirect
// logic). After this change, STUB_MODULES is EMPTY — both "coming soon"
// items from the original roadmap are now real, working features.
//
// In ORG_NAV, add after Code Quality:
//   { href: "/dashboard/ai-red-team", icon: Zap, label: "AI Red Team" },
//
// Since STUB_MODULES is now empty, you can either remove the "Roadmap"
// section heading entirely, or leave the section rendering nothing
// (harmless) in case you add a new stub later for one of the
// out-of-scope items (Web3 audits, CTF, etc.) — your call, cosmetic
// either way.
//
// Apply the equivalent change to components/layout/mobile-sidebar.tsx.


/* ──────────────────────────────────────────────────────────────────────────
   FILE: app/(dashboard)/dashboard/ai-red-team/page.tsx — FULL REPLACEMENT
   ────────────────────────────────────────────────────────────────────────── */

// Replaces the Week 8 waitlist stub at the same path. Week 8's
// feature_waitlist signups for "ai_red_team" are still in that table —
// worth a follow-up message to those people now that it's real.


/* ──────────────────────────────────────────────────────────────────────────
   FILE: components/submissions/triage-actions.tsx and the org submissions
   list/detail pages (Week 4) — small display enhancement, optional
   ────────────────────────────────────────────────────────────────────────── */

// AI Red Team findings show up as completely normal submissions in your
// existing triage queue — that part requires NO code changes, it just
// works because they're real rows in the same table. The one optional
// nice-to-have: the researcher avatar/name display currently shows
// whatever's in profiles.full_name, which for the AI agent will already
// correctly show "VAULTX AI Red Team" — but if you want a visual badge
// distinguishing AI-originated submissions at a glance in the
// submissions list, check profile.is_system_agent (new column from this
// week's migration) and render a small "AI" tag next to the researcher
// name instead of the usual avatar initial. Skip this if you're tight
// on time — the text label alone is already clear enough not to
// confuse anyone during a demo.


/* ──────────────────────────────────────────────────────────────────────────
   Migration order
   ────────────────────────────────────────────────────────────────────────── */

// Run 008_red_team.sql after 001-007. It alters the existing `profiles`
// table (adds is_system_agent) and replaces the `leaderboard` view from
// Week 6 — both are additive/safe, no data loss, but confirm the view
// replacement actually took effect by checking the leaderboard page
// doesn't show the AI agent profile once you've run your first scan.


/* ──────────────────────────────────────────────────────────────────────────
   GitHub Actions cron setup (one-time)
   ────────────────────────────────────────────────────────────────────────── */

// 1. Copy .github/workflows/red-team-cron.yml into your real repo at
//    that exact path
// 2. Add two repo secrets (GitHub repo → Settings → Secrets and
//    variables → Actions): VAULT_APP_URL and VAULT_INTERNAL_SECRET
//    (see the comments at the bottom of the workflow file for exact
//    values)
// 3. Test it immediately via the "Run workflow" manual trigger button
//    in the Actions tab — don't wait a full day to find out it's
//    misconfigured


/* ──────────────────────────────────────────────────────────────────────────
   Multi-AI fallback — how it actually behaves
   ────────────────────────────────────────────────────────────────────────── */

// Normal operation: every AI call goes to Claude, exactly as before.
// You will not notice anything different day-to-day if Claude is healthy.
//
// On Claude failure (rate limit after retries exhausted, API outage, or
// a missing/invalid ANTHROPIC_API_KEY): the request automatically
// retries against Gemini instead, with the same system/user prompt,
// same [DATA]-wrapping injection protection (that logic lives in each
// module's prompt-building function, e.g. lib/ai/prompts.ts,
// lib/ai/red-team.ts — NOT in the client itself, so it applies
// identically regardless of which provider ends up serving the
// request).
//
// If BOTH providers fail, the caller gets one combined error message
// with both failure reasons — every existing module already has its
// own fallback-to-researcher-assessment or fallback-to-safe-default
// behavior for AI failures (see Week 4's runSeverityClassification()
// for the pattern), so a full dual-provider outage degrades gracefully
// rather than crashing user-facing flows.
//
// To verify the fallback path actually works (don't just trust the
// code — test it): temporarily set an invalid ANTHROPIC_API_KEY in
// your local .env.local, leave GEMINI_API_KEY valid, then trigger any
// AI-powered action (e.g. a code quality scan). Check your server logs
// for the "[AI] Claude failed, falling back to Gemini" warning, and
// confirm the scan still completes successfully. Then revert the key.


/* ──────────────────────────────────────────────────────────────────────────
   Testing checklist
   ────────────────────────────────────────────────────────────────────────── */

// [ ] As an org, create a github_repo target against a small real public
//     repo — confirm the first scan runs automatically and produces a
//     reasoning trace + findings
// [ ] Create a scope_description target with a written description —
//     confirm it produces sensible threat-modeling findings, not
//     generic boilerplate
// [ ] Open one of the generated findings via the link on the target
//     detail page — confirm it lands in your normal org Submissions
//     queue and can be Accepted/Rejected exactly like a human report
// [ ] Re-run a scan on the same target without changing anything —
//     confirm it does NOT create duplicate submissions for findings
//     still open from the previous scan (the contentHash idempotency
//     check)
// [ ] Pause a target, then manually trigger
//     /api/red-team/run-scheduled-scans (or wait for the GitHub Actions
//     cron) — confirm the paused target is skipped
// [ ] Check the leaderboard page — confirm "VAULTX AI Red Team" does
//     NOT appear in the rankings
// [ ] Run the multi-AI fallback test described above (temporarily break
//     ANTHROPIC_API_KEY) — confirm Gemini fallback actually fires and
//     the feature still works end to end

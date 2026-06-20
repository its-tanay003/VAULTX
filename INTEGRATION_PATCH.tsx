/* ════════════════════════════════════════════════════════════════════════
   INTEGRATION PATCH — Week 8 (Polish Sprint 2 + Stubs)
   ════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────────────
   package.json — ONE addition needed
   ────────────────────────────────────────────────────────────────────────── */

// The seed script (scripts/seed-demo-data.mjs) reads .env.local via dotenv,
// which was not previously a dependency. Add to devDependencies:
//
//   "dotenv": "^16.4.5"
//
// And add this script entry:
//
//   "seed": "node scripts/seed-demo-data.mjs"
//
// Then: npm install && npm run seed


/* ──────────────────────────────────────────────────────────────────────────
   FULL DROP-IN REPLACEMENTS (overwrite the old version entirely)
   ────────────────────────────────────────────────────────────────────────── */

// app/page.tsx                                      — landing page now animated
// app/layout.tsx                                     — enhanced SEO + JSON-LD + Toaster a11y fix
// components/layout/sidebar.tsx                      — stub modules now real links
// components/providers/command-palette-provider.tsx  — dynamic import perf fix


/* ──────────────────────────────────────────────────────────────────────────
   NEW FILES — copy as-is
   ────────────────────────────────────────────────────────────────────────── */

// components/landing/animated-hero.tsx
// components/landing/feature-showcase.tsx
// components/landing/scroll-reveal.tsx
// components/landing/animated-stats-bar.tsx
// app/(dashboard)/dashboard/ptaas/page.tsx
// app/(dashboard)/dashboard/ai-red-team/page.tsx
// app/actions/waitlist.ts
// app/opengraph-image.tsx
// app/twitter-image.tsx
// scripts/seed-demo-data.mjs
// supabase/migrations/006_waitlist.sql
// supabase/RESET_DEMO_DATA.sql


/* ──────────────────────────────────────────────────────────────────────────
   MANUAL EDIT REQUIRED — components/layout/mobile-sidebar.tsx
   ────────────────────────────────────────────────────────────────────────── */

// See MOBILE_SIDEBAR_PATCH.tsx in this zip for the exact 2-block diff —
// promotes PTaaS/AI Red Team from inert <div>s to real <Link>s, matching
// the desktop sidebar change.


/* ──────────────────────────────────────────────────────────────────────────
   .env.local addition required before running the seed script
   ────────────────────────────────────────────────────────────────────────── */

// DEMO_ORG_OWNER_EMAIL=you@yourrealtestaccount.com
//
// This must be an email you've already signed up with through the normal
// VAULTX UI, completed org onboarding for (role='org', org_id set). The
// seed script seeds programs/submissions/rewards under YOUR existing org
// so the demo account you actually log in as during the presentation is
// fully populated — it does not create a throwaway account you'd have to
// separately remember credentials for.
//
// SUPABASE_SERVICE_ROLE_KEY should already be in .env.local from earlier
// weeks' .env.example — confirm it's actually populated, not just present
// as a placeholder, since the seed script needs real admin API access.


/* ──────────────────────────────────────────────────────────────────────────
   Running the seed script — step by step
   ────────────────────────────────────────────────────────────────────────── */

// 1. npm install                       (picks up the new dotenv dependency)
// 2. Sign up + complete org onboarding through the normal UI if you
//    haven't already, using the email you'll put in DEMO_ORG_OWNER_EMAIL
// 3. Add DEMO_ORG_OWNER_EMAIL to .env.local (see above)
// 4. npm run seed
// 5. Watch the console output — it prints a summary (researcher count,
//    program count, submission count, reward count) when done
// 6. Log into VAULTX as your org account — dashboard should now be full
//    of realistic data instead of empty states
//
// Re-run anytime before a demo for fresh-feeling data. If it starts to
// feel cluttered after several runs, run supabase/RESET_DEMO_DATA.sql
// first to clear synthetic researchers and their submissions/rewards.


/* ──────────────────────────────────────────────────────────────────────────
   Testing checklist for this week's work
   ────────────────────────────────────────────────────────────────────────── */

// [ ] Landing page hero animates in on load (badge → headline → subhead →
//     CTAs → social proof → dashboard preview, staggered)
// [ ] Scroll down the landing page — feature cards and "How it works"
//     steps fade+rise into view as you reach them (not all at once)
// [ ] Stats bar numbers count up when scrolled into view
// [ ] Click "PTaaS" or "AI Red Team" in the sidebar — lands on a real
//     page, not a dead link; "Join waitlist" button works and persists
// [ ] Share the deployed URL in Slack/iMessage/Twitter compose (don't
//     need to actually post) — confirm the OG image preview renders
//     correctly, not a blank/broken image
// [ ] View page source on the landing page — confirm the JSON-LD
//     <script type="application/ld+json"> block is present
// [ ] Press ⌘K for the first time in a fresh session — slight delay is
//     expected (that's the dynamic import fetching), then opens normally;
//     press ⌘K again — should open instantly (already loaded)
// [ ] Run `npm run seed` against a test/dev Supabase project — confirm
//     it completes without errors and the dashboard populates
// [ ] Read through DEMO_SCRIPT.md once, out loud, with a timer running


/* ──────────────────────────────────────────────────────────────────────────
   What's left after this week
   ────────────────────────────────────────────────────────────────────────── */

// Week 9 is buffer + demo prep only — no new features. Per the original
// blueprint: full end-to-end bug sweep, demo data cleanup/re-seed,
// critical-bug-fixes-only, record a backup demo video, rehearse the
// live demo 3x using DEMO_SCRIPT.md, confirm domain + SSL, set up
// uptime monitoring, final deploy + smoke test, ship.

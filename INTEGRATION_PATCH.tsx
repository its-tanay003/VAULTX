/* ════════════════════════════════════════════════════════════════════════
   INTEGRATION PATCH — Week 7 (Polish Sprint 1)
   ════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────────────
   FILES THAT ARE FULL DROP-IN REPLACEMENTS (just overwrite the old version)
   ────────────────────────────────────────────────────────────────────────── */

// app/layout.tsx                          — now wraps children in ThemeProvider
// app/(dashboard)/dashboard/layout.tsx     — PageTransition + CommandPaletteProvider + SkipToContent
// components/layout/header.tsx             — mobile hamburger, responsive search, ⌘K wiring
// components/layout/sidebar.tsx            — now hidden md:flex (mobile uses drawer instead)
// components/ui/stat-card.tsx              — numeric values now animate via AnimatedCounter
// app/(dashboard)/dashboard/settings/page.tsx — adds Appearance card with ThemeToggle


/* ──────────────────────────────────────────────────────────────────────────
   NEW FILES — copy as-is, no merging needed
   ────────────────────────────────────────────────────────────────────────── */

// components/providers/page-transition.tsx
// components/providers/command-palette-provider.tsx
// components/providers/theme-provider.tsx
// components/command/command-palette.tsx
// components/layout/mobile-sidebar.tsx
// components/ui/animated-counter.tsx
// components/ui/theme-toggle.tsx
// components/ui/empty-state.tsx
// components/ui/skip-to-content.tsx
// components/skeletons/skeleton-primitives.tsx
// hooks/use-command-palette.tsx
// app/not-found.tsx
// app/global-error.tsx
// app/(dashboard)/dashboard/error.tsx
// All app/**/loading.tsx files (15 of them — see file tree)


/* ──────────────────────────────────────────────────────────────────────────
   MANUAL CSS MERGE REQUIRED
   ────────────────────────────────────────────────────────────────────────── */

// Append the entire contents of app/light-theme-additions.css to the
// @layer base section of your existing app/globals.css (right after the
// :root { ... } block). This is a pure addition — no existing rules
// need to change.


/* ──────────────────────────────────────────────────────────────────────────
   OPTIONAL: swap scattered EmptyState patterns for the shared component
   ────────────────────────────────────────────────────────────────────────── */

// Not required for the demo to work, but recommended for consistency.
// Wherever you see a hand-rolled "no data" block (org dashboard,
// researcher dashboard, programs list, submissions list, code quality
// page), it can be replaced with:
//
//   <EmptyState
//     icon={<Bug className="w-6 h-6" />}
//     title="No submissions yet"
//     description="..."
//     action={{ href: "...", label: "..." }}
//   />
//
// This is cosmetic cleanup, not a functional requirement — skip it if
// you're tight on time this week.


/* ──────────────────────────────────────────────────────────────────────────
   Why no new npm packages were needed
   ────────────────────────────────────────────────────────────────────────── */

// framer-motion and next-themes were both already in package.json from
// Week 1 (anticipating this exact polish sprint). Run `npm install` only
// if you somehow skipped installing them initially — otherwise nothing
// to add this week.


/* ──────────────────────────────────────────────────────────────────────────
   Testing checklist for this week's work
   ────────────────────────────────────────────────────────────────────────── */

// [ ] Navigate between dashboard pages — confirm subtle fade+rise transition
// [ ] Watch a stat card on first page load — numbers should count up from 0
// [ ] Press ⌘K (or Ctrl+K) anywhere in the dashboard — palette opens
// [ ] Type a submission/program title in the palette — live search results appear
// [ ] Throttle network to "Slow 3G" in DevTools, navigate — skeleton loaders
//     should appear instead of blank white flashes
// [ ] Resize browser to 375px width — sidebar disappears, hamburger menu
//     appears in header, drawer opens/closes smoothly
// [ ] Visit a nonexistent URL like /dashboard/org/programs/fake-id-xyz —
//     should hit not-found.tsx, not a generic Next.js error page
// [ ] Go to Settings → Appearance — toggle Light mode, confirm readable
//     contrast across at least the dashboard overview and a list page
// [ ] Tab from the URL bar using only keyboard — first tab stop should be
//     the (invisible until focused) "Skip to main content" link

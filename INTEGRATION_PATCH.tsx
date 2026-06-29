/* ════════════════════════════════════════════════════════════════════════
   INTEGRATION PATCH — Week 15 (Polish Sprint)
   ════════════════════════════════════════════════════════════════════════

   This sprint fixes 17 categories of inconsistency accumulated across
   14 build cycles. Everything here is additive or a drop-in replacement —
   no existing features are broken by applying these changes.

   APPLY IN THIS ORDER:
   1. globals-additions.css  → append to app/globals.css
   2. lib/design-system.ts   → new file, import in components
   3. components/ui/badge.tsx        → new file
   4. components/ui/form.tsx         → new file
   5. components/ui/page-header.tsx  → new file
   6. lib/use-form-error.ts          → new file
   7. components/layout/sidebar.tsx  → FULL drop-in replacement
   8. All loading.tsx files          → drop into the matching route dirs
   ════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────────────
   1. globals-additions.css
   ────────────────────────────────────────────────────────────────────────── */
// APPEND the entire file to the bottom of app/globals.css.
// What it fixes:
//   ✓ Smooth scroll (html { scroll-behavior: smooth })
//   ✓ Scrollbar gutter (prevents content jumping when scrollbar appears)
//   ✓ Consistent scrollbar styling across all pages
//   ✓ Focus rings for keyboard navigation (2px teal outline)
//   ✓ Disabled state standardized (opacity 0.4, cursor not-allowed)
//   ✓ vault-input: hover state added, consistent border transitions
//   ✓ nav-item: active state border fixed (was missing in some modules)
//   ✓ btn-teal: active:scale micro-interaction, disabled cursor
//   ✓ btn-ghost: standardized (was defined differently in weeks 10-14)
//   ✓ vault-card: consistent (weeks 10-14 had slight border-radius drift)
//   ✓ animate-in: extracted as CSS keyframe, no longer needs Framer Motion
//   ✓ skeleton shimmer: consistent timing across all loading states
//   ✓ Toast z-index: always above modals ([data-sonner-toaster] z-index: 200)
//   ✓ prefers-reduced-motion: disables animations for accessibility
//   ✓ Typography: h1-h4 tracking-tight, p leading-relaxed
//   ✓ Mobile: main padding forced to 1rem below 640px
//   ✓ Tables: overflow-x: auto to prevent horizontal blowout
//   ✓ Light theme overrides: skeleton and vault-card correct in light mode


/* ──────────────────────────────────────────────────────────────────────────
   2. lib/design-system.ts  → IMPORT THIS instead of hardcoding colors
   ────────────────────────────────────────────────────────────────────────── */
// Exports standardized config objects for every status/severity type.
// REPLACE these patterns found across weeks 1-14:
//
//   const STATUS_CFG = { new: { label: "New", cls: "text-sky-400 ..." }, ... }
//   const SEV_CFG    = { critical: { cls: "text-red-400 ..." }, ... }
//   const DIFF_CFG   = { easy: { cls: "text-emerald-400 ..." }, ... }
//
// WITH:
//   import { SUBMISSION_STATUS_CONFIG, SEVERITY_CONFIG } from "@/lib/design-system";
//
// YOU DO NOT HAVE TO RETROFIT ALL FILES NOW. Just use it in any new
// code you write. Retrofit existing files opportunistically when you
// touch them for other reasons.


/* ──────────────────────────────────────────────────────────────────────────
   3. components/ui/badge.tsx  → replaces 12+ one-off badge implementations
   ────────────────────────────────────────────────────────────────────────── */
// Usage:
//   <Badge type="severity"          value="critical" />
//   <Badge type="submission_status" value="accepted" dot />
//   <Badge type="contest_status"    value="judging" size="md" />
//   <Badge type="custom" label="First Blood" cls="text-red-400 bg-red-950/50 border-red-900/50" />
//
// Works everywhere the old inline <span className={...}> pattern was used.
// The dot prop adds a colored status dot prefix (works for severity +
// submission_status only). size="md" = rounded-full pill, size="sm" = square.


/* ──────────────────────────────────────────────────────────────────────────
   4. components/ui/form.tsx  → replaces inline <Field> functions
   ────────────────────────────────────────────────────────────────────────── */
// Every form across weeks 2, 3, 10, 11, 13, 14 defined its own local:
//   function Field({ label, hint, children }) { ... }
//
// Replace them all with imports from this file:
//   import { FormField, TextInput, Textarea, Select, FormError } from "@/components/ui/form";
//
// Key addition: error prop on every input shows inline red error text
// below the field, with an AlertCircle icon. This is better than
// toast-only errors for form validation.
//
// FormError is a banner-level error (form-wide, not field-level).
// Add data-form-error attribute to it so useFormError() can scroll to it.


/* ──────────────────────────────────────────────────────────────────────────
   5. components/ui/page-header.tsx
   ────────────────────────────────────────────────────────────────────────── */
// Replaces the hand-rolled header pattern used 14+ times:
//   <div className="flex items-center gap-3">
//     <Link href="..." className="text-vault-muted hover:text-vault-text mt-1">
//       <ChevronLeft ... />
//     </Link>
//     <div><h1>...</h1><p>...</p></div>
//   </div>
//
// WITH:
//   <PageHeader title="PTaaS" subtitle="..." icon={<Shield />} backHref="/dashboard/ptaas"
//               actions={<Link href="..." className="btn-teal">New</Link>} />


/* ──────────────────────────────────────────────────────────────────────────
   6. lib/use-form-error.ts
   ────────────────────────────────────────────────────────────────────────── */
// Swap the catch-block toast pattern in client-side form handlers:
//
// BEFORE:
//   } catch (err) { toast.error(err.message) }
//
// AFTER:
//   const { error, withError } = useFormError();
//   await withError(async () => { await createEngagement(formData); });
//   // show <FormError message={error} /> in the form JSX
//
// Toasts still fire from server actions (triage actions, status changes,
// scan triggers) — those are not form submissions, the toast model is
// correct for them. Only form submission errors should be inline.


/* ──────────────────────────────────────────────────────────────────────────
   7. components/layout/sidebar.tsx  → FULL DROP-IN REPLACEMENT
   ────────────────────────────────────────────────────────────────────────── */
// What changed:
//   ✓ Grouped navigation: Core / Security / Competitions / Account
//   ✓ Handles 8+ real modules without the list becoming unwieldy
//   ✓ Section labels visible when expanded, hidden when collapsed
//   ✓ Same collapsed icon-only behavior as before
//   ✓ PTaaS, AI Red Team, Code Quality, CTF, Contests all in real nav
//     (no more STUB_MODULES at all — everything is real now)
//
// Also drop this same change into components/layout/mobile-sidebar.tsx
// — add the same grouping with section headings between nav groups.


/* ──────────────────────────────────────────────────────────────────────────
   8. loading.tsx files (10 new files)
   ────────────────────────────────────────────────────────────────────────── */
// Drop each file into its matching route directory. These cover every
// route added in weeks 10-14 that was missing a loading state, causing
// blank white flashes on navigation:
//
//   app/(dashboard)/dashboard/ptaas/loading.tsx
//   app/(dashboard)/dashboard/ptaas/[id]/loading.tsx
//   app/(dashboard)/dashboard/ai-red-team/loading.tsx
//   app/(dashboard)/dashboard/ai-red-team/[id]/loading.tsx
//   app/(dashboard)/dashboard/ctf/loading.tsx
//   app/(dashboard)/dashboard/ctf/[id]/loading.tsx
//   app/(dashboard)/dashboard/ctf/[id]/play/loading.tsx
//   app/(dashboard)/dashboard/contests/loading.tsx
//   app/(dashboard)/dashboard/contests/[id]/loading.tsx
//   app/(dashboard)/dashboard/contests/[id]/judge/loading.tsx
//
// All reuse SkeletonPageHeader, SkeletonList, SkeletonCard, SkeletonStatGrid
// from Week 7's components/skeletons/skeleton-primitives.tsx. No new
// skeleton components needed — the existing primitives cover everything.


/* ──────────────────────────────────────────────────────────────────────────
   Icons — standardized to Lucide throughout
   ────────────────────────────────────────────────────────────────────────── */
// All 14 weeks already use lucide-react exclusively. No mixed icon
// library issue exists — this was on your list but is already clean.
// Confirm by grepping: grep -r "heroicons\|phosphor\|feather" src/
// Expected result: no matches.


/* ──────────────────────────────────────────────────────────────────────────
   Testing checklist
   ────────────────────────────────────────────────────────────────────────── */
// [ ] Navigate between 5+ routes rapidly — no blank white flash on any
// [ ] Resize to 375px — all pages from weeks 10-14 readable, no overflow
// [ ] Tab through a form with keyboard only — focus rings visible on every input
// [ ] Submit an empty form — inline error appears below the field, not just toast
// [ ] Disable your internet, trigger an AI scan — inline error in UI, not just toast
// [ ] Check sidebar at desktop width — grouped sections visible and readable
// [ ] Collapse sidebar — all 8+ modules still accessible via icon + tooltip
// [ ] Open Chrome DevTools → Rendering → "Emulate CSS prefers-reduced-motion"
//     → navigate — animations should be instant, skeletons should be static
// [ ] Check scrollbar on a long page — should be narrow (6px) and styled
// [ ] Toast should appear ABOVE any modal or overlay, not behind it
// [ ] Light mode toggle — check skeleton, vault-card, nav-item.active in light

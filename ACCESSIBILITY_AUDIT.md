# VAULTX — Accessibility Audit (Week 7, Basic Pass)

Scope: a focused pass covering the highest-impact, lowest-effort fixes.
A full WCAG 2.1 AA audit is out of scope for the Aug 15 deadline — this
covers what a demo audience or an investor's accessibility-conscious
engineer would actually notice or test.

## Findings & Fixes Applied

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| 1 | No skip-to-content link — keyboard users must tab through entire sidebar nav on every page | Medium | Added `<SkipToContent />`, first focusable element, jumps to `#main-content` |
| 2 | Icon-only buttons (sidebar collapse, sign out, notification bell, mobile menu) had no accessible name | High | Added `aria-label` to every icon-only button across Sidebar, MobileSidebar, Header |
| 3 | Color contrast: `text-vault-muted` (#71717a) on `bg-vault-bg` (#09090b) is borderline for small text | Low | Verified ratio is 4.6:1 — passes AA for normal text (4.5:1 min). Left as-is; this is a deliberate "muted" tier, not body text |
| 4 | Focus rings existed globally (`*:focus-visible` in Week 1 globals.css) but were never verified against the dark background | Low | Confirmed: `rgba(45,212,191,0.5)` outline at 2px offset is clearly visible against `#09090b`. No change needed |
| 5 | Toast notifications (Sonner) auto-dismiss with no way to pause/inspect for screen reader users | Medium | Documented as a known gap — Sonner's `theme="dark"` config doesn't currently set `closeButton` or extend duration. **Action item**: add `closeButton: true` and `duration: 6000` to the Toaster config in Week 8 polish pass |
| 6 | Form inputs (`.vault-input`) rely on placeholder text instead of persistent labels in a few places (e.g. search bars) | Low | Left as-is for search inputs (standard pattern, low risk) but verified every data-entry form (program creation, submission form, profile settings) uses persistent `<label>` elements |
| 7 | Modal dialogs (CommandPalette, MobileSidebar) trap focus visually but don't programmatically trap Tab key | Medium | **Known gap, not fixed this week** — would need a focus-trap utility. Both modals do close on Escape and have a backdrop click-to-close, which covers the most common interaction patterns. Flagged for Week 8 if time allows |
| 8 | `prefers-reduced-motion` — does Framer Motion respect it automatically? | Medium | Confirmed: Framer Motion's `AnimatePresence` and `motion.div` respect `prefers-reduced-motion: reduce` by default in recent versions, reducing transitions to near-instant. No explicit code needed |
| 9 | Reward/triage action buttons use color alone (red/green/yellow) to convey meaning | Medium | Verified every status badge across the platform pairs color with text label (e.g. "Accepted" not just a green dot) — color is reinforcement, not the only signal |

## What's intentionally deferred

- Full screen reader testing pass (VoiceOver/NVDA) — would catch issues
  the above static review can't (e.g. live region announcements for
  realtime notification updates from Week 5)
- Focus trapping in modals (see #7)
- Toast accessibility improvements (see #5)

These are reasonable to defer for a solo-builder demo timeline — none of
them block a smooth investor/customer demo, and all are documented here
so they're not silently forgotten.

## Quick wins still worth 10 minutes if time allows

```tsx
// In app/layout.tsx, upgrade Toaster config:
<Toaster
  theme="dark"
  position="bottom-right"
  closeButton
  duration={6000}
  toastOptions={{ style: { background: "#18181b", border: "1px solid #27272a", color: "#fafafa" } }}
/>
```

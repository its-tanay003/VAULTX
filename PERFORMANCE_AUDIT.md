# VAULTX — Performance Audit (Week 8)

Scope: a focused review against what Lighthouse would flag, prioritized
by realistic demo-day impact. Not every finding gets a code fix — some
are documented as accepted tradeoffs given the timeline.

## Top findings, ranked by impact

### 1. ✅ FIXED — Command palette in every page's initial bundle

**Finding:** `CommandPalette` imports Framer Motion's `AnimatePresence`
and does Supabase queries, but was eagerly bundled into every dashboard
route even though most sessions never open it.

**Fix:** `CommandPaletteProvider` now uses `next/dynamic` with
`ssr: false` and a lazy-mount-once pattern — the component's code
doesn't get fetched until the user's first ⌘K press, and stays mounted
afterward (so its own exit animation still plays correctly on
subsequent closes). See `components/providers/command-palette-provider.tsx`.

**Estimated impact:** ~15-20KB of JS removed from initial dashboard
page load, plus avoids Framer Motion's AnimatePresence overhead until
actually needed.

### 2. ✅ ALREADY CORRECT — Font loading

**Finding (verified, not a bug):** Geist Sans/Mono are loaded via the
`geist` npm package (Week 1), which uses `next/font` under the hood —
this self-hosts the fonts and eliminates render-blocking external font
requests automatically. No action needed, just confirming this was done
right from the start.

### 3. ✅ ALREADY CORRECT — Image domains and remote patterns

**Finding (verified):** `next.config.ts` already restricts
`images.remotePatterns` to the three actual external image sources
(GitHub avatars, Google avatars, Supabase Storage) rather than allowing
any domain — this is both a security and performance best practice
(prevents Next.js Image Optimization from being abused as an open proxy).

### 4. ⚠️ DOCUMENTED, NOT FIXED — Avatar images use `<img>` not `next/image`

**Finding:** Avatar rendering throughout the app (`Sidebar`,
`MobileSidebar`, `NotificationBell`, leaderboard, profile pages) uses
plain `<img>` tags instead of `next/image`, missing automatic
lazy-loading, responsive `srcset`, and format optimization (WebP/AVIF).

**Why not fixed this week:** Avatars are small (32-64px), low in count
per page (rarely more than 5-10 visible at once), and `next/image`
requires explicit `width`/`height` props on every usage site —
touching ~12 files for a marginal win isn't the best use of remaining
time before the deadline.

**If you have 30 spare minutes:** swap `<img>` for `next/image` in
`components/layout/sidebar.tsx` and `components/realtime/notification-bell.tsx`
first — those render on every single page load.

### 5. ⚠️ DOCUMENTED, NOT FIXED — Realtime subscriptions stay open across navigation

**Finding:** `RealtimeSubmissionStatus` and `NotificationBell` both open
Supabase Realtime WebSocket channels. These correctly clean up via
`useEffect` return functions when their specific component unmounts,
but `NotificationBell` lives in the Header (always mounted) so its
channel stays open for the entire session — this is intentional and
fine for a single-tenant demo, but worth knowing it's not free at scale
(each open channel is a small ongoing resource cost on Supabase's side).

**Action:** none needed for demo. Note for post-MVP: if researcher
session counts grow, consider consolidating to a single multiplexed
channel per user instead of one per notification-relevant component.

### 6. Landing page animation cost

**Finding:** The new animated hero (Week 8) uses Framer Motion's
`whileInView` on every feature card and stat number — six separate
`useInView` observers on the features section alone.

**Verified, not a real problem:** `useInView` uses the browser's native
`IntersectionObserver` API under the hood, which is extremely cheap
(it doesn't poll, it's event-driven). Six observers on one page is
nowhere near a meaningful performance concern. Documented here only to
preempt the question if someone reviews the animation code and worries
about it.

## What a full Lighthouse run would likely still flag

Not run this week due to time, but anticipated findings if you do run
one before the demo:

- **Largest Contentful Paint** on the landing page hero text — likely
  fine given font self-hosting, but worth a real Lighthouse pass the
  week of the demo (Week 9) just to catch anything environment-specific
  (Cloudflare Pages CDN behavior, cold-start timing)
- **Cumulative Layout Shift** — the `loading.tsx` skeletons added in
  Week 7 should keep this low since they match real content dimensions,
  but verify visually on a throttled connection before demo day
- **Total Blocking Time** — worth checking after the Week 8 landing
  page changes specifically, since that's where the most new
  client-side JS was added this week

## Recommendation for Week 9

Run an actual Lighthouse audit (Chrome DevTools, or `npx lighthouse
<your-deployed-url>`) early in Week 9's buffer time, not on the morning
of the demo. If anything scores below ~75 on Performance, that's the
moment to decide whether it's worth a fix or an accepted tradeoff —
not during demo prep itself.

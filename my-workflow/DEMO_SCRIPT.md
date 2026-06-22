# VAULTX — Demo Script

**Target length: 6-7 minutes.** Rehearse this out loud at least 3 times
before the real thing. Time yourself. Cut ruthlessly if you're running long
— a tight 5-minute demo beats a rambling 10-minute one every time.

---

## Before you start

- [ ] Run `node scripts/seed-demo-data.mjs` the morning of the demo (fresh data feels alive, stale data feels staged)
- [ ] Open two browser windows side by side: one logged in as your org account, one in incognito/private mode ready to log in as a researcher
- [ ] Close every other tab and app — Slack notifications popping up mid-demo kill momentum
- [ ] Have your phone in airplane mode or silenced
- [ ] Know your internet is stable — if presenting remotely, have a hotspot backup
- [ ] Pre-load the org dashboard so the first thing they see isn't a loading skeleton

---

## The narrative arc (memorize this, not the exact words)

1. **The problem** (30s) — security teams drown in noisy, duplicate bug reports
2. **The core loop** (3 min) — show submit → AI validate → triage → reward, live, in real time across two windows
3. **The differentiator** (1.5 min) — the AI invariants, code quality reuse, leaderboard
4. **The roadmap** (30s) — stub pages prove this is a platform, not a feature
5. **Close** (30s) — zero-cost stack, built solo, shipped on deadline

---

## Minute-by-minute script

### 0:00 – 0:30 — Open on the landing page

> "This is VAULTX — a unified platform for bug bounty, vulnerability
> disclosure, and code quality, built around one idea: AI should kill the
> noise in security reporting, but humans should always make the
> decisions that matter."

Scroll once, slowly, through the hero and feature grid. Don't linger —
this is texture, not the point.

**Fallback if internet is slow:** skip straight to "let me show you the
product" and jump to the dashboard. The landing page is nice-to-have, not
load-bearing.

### 0:30 – 1:00 — Org dashboard

> "I'm logged in as an organization running three active programs. You
> can see real submission volume, acceptance rate, and reward activity —
> this isn't placeholder data, the platform has been live for [X] weeks."

Point at the stat cards as they count up (this should already have
happened on load, but if you refresh, narrate the count-up — it's a
nice touch, not the headline).

### 1:00 – 2:30 — The core loop, live, two windows

This is the centerpiece. Two browser windows side by side.

**Window A (researcher, incognito):**
> "I'm a researcher who found a vulnerability. I submit a structured
> report — title, description, steps to reproduce, impact."

Submit a new report on a real active program. Use a pre-written example
so you're not typing live and losing momentum:
*"Stored XSS in /api/v2/users profile bio field allows session hijacking"*

> "Watch what happens next — without me refreshing anything."

**Window B (org):**
> "Within a few seconds, AI has run a three-stage validation: exact hash
> match, fuzzy text comparison, and a semantic comparison via Claude. It's
> also suggested a severity with a confidence score."

Point at the notification bell incrementing live, then open the
submission. Show the AI panel: severity, confidence bar, analysis text.

> "Critically — this is AI *suggesting*, not deciding. A human triager
> makes the actual call."

Click **Accept**. Switch to Window A.

> "And the researcher sees it update in real time too — no refresh."

### 2:30 – 3:30 — Rewards and the human-approval invariant

> "Here's the part I'm proudest of architecturally. When I propose a
> reward..."

Propose a $500 reward on the just-accepted submission.

> "...it sits in a *pending* state. Nothing has happened yet. I have to
> separately, explicitly approve it as a human."

Click **Approve**.

> "This isn't just a UI convention — it's enforced at the database level.
> There's a PostgreSQL trigger that will reject any reward transitioning
> to 'approved' status if there's no human approver attached. Even a
> direct SQL query against the database can't bypass it. AI can suggest
> severity, AI can flag duplicates, but AI can never move money."

*(Optional, if you have an extra 30 seconds and a technical audience:
open the Supabase SQL editor and show the trigger function. This is a
strong "we thought about this seriously" beat — use it for technical
investors, skip it for a general audience.)*

### 3:30 – 4:30 — Leaderboard, earnings, code quality

> "Researchers build reputation over time."

Switch to the leaderboard. Point at the podium.

> "And the same AI infrastructure validating vulnerability reports also
> powers something else — code quality auditing."

Navigate to Code Quality, paste a real public GitHub repo URL if you
have one ready (small, well-known project works best), or open an
already-scanned repo.

> "Paste a public repo, and the same Claude integration reviews it for
> security issues, performance anti-patterns, and code quality — same
> injection-protected prompt architecture, second use case."

Point at the score ring and a specific finding.

### 4:30 – 5:00 — The roadmap (stub pages)

> "Two things are clearly on the roadmap rather than built yet — PTaaS
> and AI Red Team. I didn't want dead links in the nav, so each one is a
> real page describing what's coming, with a waitlist that's already
> capturing genuine interest signal."

Click into one stub page briefly. Don't dwell — 15 seconds, max.

### 5:00 – 5:30 — Close

> "This entire platform — auth, real-time updates, AI validation, email
> notifications, reward management, code quality scanning — runs on a
> completely free tier stack: Supabase, Cloudflare Pages, Resend,
> Upstash, and Claude. Built solo, [X] weeks, zero infrastructure cost."

Stop talking. Let the silence sit for a beat. Ask if they have questions.

---

## Common questions to pre-rehearse answers for

**"What happens at scale — does the free tier hold up?"**
> "Supabase free tier covers 500MB and 50K monthly active users, which is
> well past where this needs to be for a demo or early pilot. The
> architecture — Postgres + RLS + triggers — doesn't change as we scale,
> we'd just move to paid tiers of the same services. No rewrite required."

**"How do you prevent AI hallucination from causing a bad triage decision?"**
> "Two layers: first, the AI output is always labeled as a suggestion
> with a confidence score, never auto-applied. Second, every AI action
> writes to an immutable audit log — also enforced by a database trigger
> that blocks UPDATE and DELETE on that table entirely. If something goes
> wrong, there's a permanent record of exactly what the AI said and when."

**"What's the business model?"**
> *(Answer this honestly based on your actual plan — don't have one
> scripted here since it depends on your specific strategy. But have an
> answer ready before you walk in.)*

**"Why not just use HackerOne / Bugcrowd?"**
> "Existing platforms are bug-bounty-only and treat code quality, AI
> validation, and reward governance as separate concerns or missing
> entirely. VAULTX unifies the full lifecycle — submission to triage to
> payment to code health — in one platform with AI doing the
> first-pass work humans don't want to do, while keeping humans in
> control of every decision that has financial or reputational stakes."

---

## If something breaks live

- **AI validation doesn't complete in time:** narrate it — "AI analysis
  is running, usually takes under 10 seconds, let's keep moving and I'll
  circle back" — then continue the demo and check back later, or skip
  to a submission that's already been validated from the seed data.
- **Realtime doesn't update across windows:** refresh manually, say
  "let me just confirm that landed" — don't panic-narrate the failure.
- **A page errors out:** you have a real 404 page and a real error
  boundary (Week 7) — if you hit one, it'll look intentional, not broken.
  Navigate back via the sidebar and continue.
- **Total platform failure:** have 3-4 screenshots of key screens saved
  locally as a last-resort fallback. Never let a demo become "let me try
  that again" more than once.

---

## After the demo

Don't ask "any questions?" and then go silent and awkward. Instead:

> "I'd love to hear what stood out, or what's missing that you'd want to
> see before [next step — pilot, investment, whatever applies]."

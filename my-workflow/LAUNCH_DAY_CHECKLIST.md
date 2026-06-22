# VAULTX — Launch Day Checklist

Use this the morning of the demo (or the morning of actually launching,
whichever comes first). Everything above this point — Weeks 1-8 plus
the QA sweep, deployment, and monitoring setup — should already be done.
This is the final pass.

---

## T-minus 1 week (start of Week 9)

- [ ] Work through `QA_BUG_SWEEP_CHECKLIST.md` completely, fix only what's broken
- [ ] Complete `DEPLOYMENT_RUNBOOK.md` — production deploy, domain, SSL, monitoring
- [ ] Run `npm run seed` against production for the first time — confirm the seed script works against the real production database, not just local/dev (these can behave differently if RLS policies differ even slightly)
- [ ] Read `DEMO_SCRIPT.md` out loud once, with a timer, just to find the rough edges

## T-minus 3 days

- [ ] Full rehearsal #1 — actually run through the two-window live demo using `DEMO_SCRIPT.md`, on the real production deployment, timed
- [ ] Note anywhere you stumbled, anywhere the AI took longer than expected, anywhere the script's wording felt unnatural when said out loud
- [ ] Fix only critical issues found. Do not redesign anything based on rehearsal feedback this close to the date.

## T-minus 2 days

- [ ] Full rehearsal #2 — incorporate fixes from rehearsal #1
- [ ] Record a backup demo video (screen recording, full run-through, no narration needed but helpful if you can manage it) — save it somewhere accessible even if your laptop or wifi fails on the actual day
- [ ] Re-run `npm run seed` if your rehearsals have made the data feel stale or repetitive — fresh data feels alive

## T-minus 1 day

- [ ] Full rehearsal #3 — should feel smooth at this point
- [ ] Confirm UptimeRobot shows no incidents in the last 48 hours
- [ ] Charge your laptop fully, and bring the charger anyway
- [ ] Confirm your hotspot/backup internet actually works if presenting remotely or somewhere with unreliable wifi
- [ ] Close every unnecessary application and browser tab on the machine you'll present from — set this up the night before, not 5 minutes before
- [ ] Re-read the "If something breaks live" section of `DEMO_SCRIPT.md` one more time

## Morning of

- [ ] Run the final smoke test from `DEPLOYMENT_RUNBOOK.md` one more time — confirm the full loop still closes cleanly
- [ ] Re-seed demo data if it's been more than a day or two since the last seed
- [ ] Open your two browser windows (org + researcher incognito), pre-logged-in, dashboard pre-loaded — don't make the audience watch you log in
- [ ] Silence your phone, close Slack, close email
- [ ] Take a breath. You built a full security intelligence platform — auth, real-time collaboration, a 3-stage AI validation pipeline, database-enforced financial controls, email infrastructure, code quality scanning, and a polished UI — solo, in 9 weeks, on a zero-dollar budget. Whatever happens in the room, that's already true.

---

## Post-demo (same day, while it's fresh)

- [ ] Write down every question you got asked, especially ones you didn't have a great answer for — this becomes your prep list for the next conversation, whatever that is
- [ ] Note anything that visibly confused people during the walkthrough — that's signal about what needs clearer explanation or a UI tweak, even if you don't act on it immediately
- [ ] If using `feature_waitlist` signups as a signal, check `waitlist_summary` view to see if anyone in the room actually clicked through to PTaaS or AI Red Team during/after the demo

---

You started this project negotiating a 12+ module scope down to a tight
five-step core loop because that was the only way to actually ship by
August 15. That discipline — knowing what to cut, when to stop polishing
and start rehearsing — is the real skill this project exercised, more
than any individual line of code. Good luck.

# VAULTX — Deployment & Monitoring Runbook

Everything here stays within the zero-budget constraint. No step in this
document costs money beyond a domain name (~$10-15/year if you don't
already own one — the one genuinely unavoidable cost in this entire
project).

---

## 1. Cloudflare Pages deployment

- [ ] Connect your GitHub repo to Cloudflare Pages (Pages → Create a project → Connect to Git)
- [ ] Build settings:
  - Framework preset: Next.js
  - Build command: `npm run build`
  - Build output directory: `.next` (or `out` if you've configured static export — confirm which based on your `next.config.ts`)
  - Node version: pin this explicitly (e.g. `20`) in environment variables as `NODE_VERSION` — Cloudflare's default can drift and silently break a build that worked locally
- [ ] Add every variable from `MASTER_ENV_CHECKLIST.md` to Pages → Settings → Environment Variables, for the **Production** environment specifically (Cloudflare separates Production and Preview env vars — easy to set one and forget the other)
- [ ] Trigger a deploy, watch the build log fully, don't just check for "Success" — scan for warnings about edge runtime compatibility (Next.js API routes using Node-specific APIs sometimes need `export const runtime = "edge"` adjustments on Cloudflare specifically)

## 2. Domain + SSL

- [ ] If you don't already own a domain, register one (Cloudflare Registrar is often cheapest if you're already in their ecosystem, but any registrar works)
- [ ] Pages → your project → Custom domains → add your domain
- [ ] Cloudflare auto-provisions SSL (Universal SSL) — this is free and usually active within minutes, but verify:
  ```
  curl -I https://your-domain.com
  ```
  should return `HTTP/2 200`, not a certificate warning
- [ ] Update `NEXT_PUBLIC_APP_URL` in production env vars to match the real domain exactly (https, no trailing slash) and redeploy — this was flagged in MASTER_ENV_CHECKLIST.md but bears repeating since it's the single easiest thing to forget
- [ ] Re-check email links (Week 5) and the OG image (Week 8) against the live domain, not localhost, after this change

## 3. Supabase production readiness

- [ ] Confirm you're on Supabase's free tier limits and understand them: 500MB database, 1GB file storage, 50K monthly active users, 2GB bandwidth — all comfortably sufficient for a demo or early pilot
- [ ] Double-check Row Level Security is enabled on every table — run this in the SQL editor as a final sanity check:
  ```sql
  select tablename, rowsecurity
  from pg_tables
  where schemaname = 'public';
  ```
  Every row should show `rowsecurity = true`. If anything shows `false`, that table has zero access control in production.
- [ ] Confirm all 6 migrations have actually been run against production (not just local/dev) — easy to lose track across 8 weeks:
  - `001_initial.sql`
  - `002_fuzzy_search.sql`
  - `003_notifications.sql`
  - `004_enable_realtime.sql`
  - `005_code_quality.sql`
  - `006_waitlist.sql`

## 4. Uptime monitoring (free)

- [ ] Sign up for UptimeRobot (free tier: 50 monitors, 5-minute check interval)
- [ ] Add a monitor for your production URL (`https://your-domain.com`)
- [ ] Add a second monitor specifically for `https://your-domain.com/api/ai/validate-submission` (GET request) — this is your AI pipeline's health check endpoint from Week 4, and a 500 here means the Claude API key or internal secret broke, which a basic homepage check wouldn't catch
- [ ] Set the alert contact to an email you'll actually see notifications from on demo day
- [ ] Don't set alert thresholds so aggressive that a single transient blip pages you mid-demo-prep — 2 consecutive failures before alerting is reasonable

## 5. Final smoke test (run this AFTER all of the above, on the real production URL)

- [ ] Open the production URL in an incognito window (no cached state from your dev sessions)
- [ ] Sign up as a brand new researcher account, end to end
- [ ] Submit a real report on a real active program
- [ ] Confirm the AI validation completes within a reasonable time on production (it may be slightly slower than local dev — note the actual timing for your demo script's pacing)
- [ ] Confirm the notification email actually lands (check spam folder too — first production emails from a domain sometimes get flagged until reputation builds)
- [ ] As the org, triage and accept it, propose and approve a reward
- [ ] Confirm the full loop closes without you touching Supabase directly at any point

If this smoke test passes clean, you are deployed and demo-ready from a
technical standpoint. Everything else is rehearsal.

---

## Rollback plan (just in case)

Cloudflare Pages keeps a deployment history — if a last-minute change
breaks something close to demo day:

- [ ] Pages → your project → Deployments → find the last known-good deployment → "Rollback to this deployment"
- [ ] This takes effect in under a minute, no rebuild needed

Know where this button is *before* you need it, not while panicking
the night before.

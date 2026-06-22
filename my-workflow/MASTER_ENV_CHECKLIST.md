# VAULTX — Master Environment Variables (Production)

Every env var introduced across Weeks 1-8, consolidated into one place.
Previously scattered across 8 separate `.env.weekN.example` files —
this is the single source of truth for what needs to be set before
deploying to Cloudflare Pages.

Copy this into your Cloudflare Pages project's environment variables
(Settings → Environment Variables), NOT into a committed file.

---

## Supabase (Week 1)

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY` are safe to expose client-side
- [ ] `SERVICE_ROLE_KEY` must NEVER be prefixed `NEXT_PUBLIC_` — it bypasses RLS entirely. Double-check this isn't accidentally exposed client-side anywhere.

## App URL (Week 1, used everywhere)

```
NEXT_PUBLIC_APP_URL=https://your-real-production-domain.com
```
- [ ] This MUST be your real production URL before launch, not localhost — it's used in email links (Week 5), OG image metadataBase (Week 8), and the internal AI validation webhook (Week 4). A wrong value here silently breaks email links and social previews.

## Claude / Anthropic AI (Week 4, Week 6)

```
ANTHROPIC_API_KEY=sk-ant-...
VAULT_INTERNAL_SECRET=<openssl rand -hex 32>
```
- [ ] Generate a fresh `VAULT_INTERNAL_SECRET` for production — don't reuse your local dev value
- [ ] Confirm your Anthropic API key has billing configured (even a small limit) — a key with no payment method attached will fail silently on first real submission

## Resend Email (Week 5)

```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@your-real-domain.com
```
- [ ] If using your own domain (recommended for production, not `onboarding@resend.dev`), confirm DNS records (SPF/DKIM) are verified in the Resend dashboard — unverified domains silently land in spam
- [ ] Send yourself a real test email through the deployed app, not just locally, before demo day

## Demo Data Seeding (Week 8 — local/dev only, NOT production)

```
DEMO_ORG_OWNER_EMAIL=you@email.com
```
- [ ] This should ONLY be set locally when running `npm run seed`. Do not set this in Cloudflare Pages production environment variables — it has no effect there since the seed script only runs via `node scripts/seed-demo-data.mjs`, but keep it out of production env vars for cleanliness anyway.

---

## Variables mentioned in the original blueprint but NOT yet wired into code

These appeared in the Week 1 tech stack list but no Week 1-8 deliverable
actually required them yet:

```
# Upstash Redis (rate limiting — Week 3 mentions this conceptually but
# the actual rate limiting implementation in app/actions/submissions.ts
# should be double-checked: confirm it's really calling Upstash and not
# just an in-memory placeholder that won't work across serverless
# invocations on Cloudflare Pages)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Stripe (planned, not built — safe to leave unset)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

**Action item for the bug sweep below:** verify the Week 3 rate limiting
code actually depends on these Upstash variables being set, and that
they're populated in production. If rate limiting was stubbed with an
in-memory Map during development, it will not work correctly across
Cloudflare Pages' distributed edge functions — this is worth 10 minutes
of code review during the bug sweep.

---

## Quick verification command

After setting all production env vars, redeploy and check:

```bash
curl https://your-domain.com/api/ai/validate-submission
# Should return: {"status":"ok","model":"claude-sonnet-4-6",...}
# If this 500s, ANTHROPIC_API_KEY or VAULT_INTERNAL_SECRET is likely missing
```

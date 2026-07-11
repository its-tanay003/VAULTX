# VAULTX — Unified Security Intelligence Platform

An AI-first, zero-infrastructure-cost cybersecurity and code intelligence platform. VAULTX unifies bug bounty programs, Vulnerability Disclosure Programs (VDP), penetration testing (PTaaS), code quality scanning, Web3 smart contract auditing, autonomous AI Red Teaming, Capture The Flag (CTF) competitions, and Code4rena-Style Audit Contests into a single dashboard. 

Built with Next.js 16 App Router (Turbopack), React 19, Supabase (PostgreSQL with RLS), Cloudflare Pages, Upstash Redis, Resend, and a resilient Multi-Provider AI Fallback Engine (Claude Sonnet + Gemini Flash).

---

## 📖 TABLE OF CONTENTS
1. [README (Top Section)](#1-readme-top-section)
2. [Final Platform Definition](#2-final-platform-definition)
3. [Complete Feature & Function System](#3-complete-feature--function-system)
4. [System Architecture](#4-system-architecture)
5. [Product Documentation (PRD, TRD, App Flows, UI/UX, DB Schema)](#5-product-documentation)
6. [Implementation Plan](#6-implementation-plan)
7. [Master Build Prompts](#7-master-build-prompts)
8. [Errors & Mistakes to Avoid](#8-errors--mistakes-to-avoid)
9. [Improvements & Future Upgrades](#9-improvements--future-upgrades)
10. [Deployment & Operations Guide (Runbooks, QA, Demo Script, Audits)](#10-deployment--operations-guide)
11. [Settings System (Week 15)](#11-settings-system)

---

## 1. README (TOP SECTION)

### Tech Philosophy
- **AI-First Integration**: Rather than acting as a simple text editor wrapper, VAULTX embeds AI directly into data ingestion pipelines to deduplicate findings, classify severities, draft test plans, perform code quality audits, and execute autonomous red-team scans.
- **Multi-AI Fallback Orchestration**: Standardizes on Anthropic's Claude Sonnet as the primary engine for high-logic security tasks. If Claude API calls time out, error, or hit rate limits, the engine transparently falls back to Google Gemini Flash.
- **Zero-Cost Production Stack**: Leverages free tiers to run a production-ready SaaS enterprise:
  - *Compute*: Cloudflare Pages edge hosting (Unlimited bandwidth & requests on free tier).
  - *Data & Realtime*: Supabase Free Tier (500MB DB, 1GB Storage, 50K MAUs, Realtime WebSockets).
  - *Cache & Rate Limiting*: Upstash Redis (10K requests/day free).
  - *Notifications*: Resend (3,000 emails/month free).
  - *AI Fallback*: Google AI Studio Gemini API (free tier limits).
- **Human-in-the-Loop Security (Hard Invariants)**: Database level constraints guarantee that AI suggestions cannot execute financial actions, alter core configuration, or delete records.

### Quick Start / Developer Setup

#### 1. Clone & Install Dependencies
```bash
git clone https://github.com/its-tanay003/VAULTX.git
cd vaultx
npm install
```

#### 2. Configure Database (Supabase)
1. Register a project at [supabase.com](https://supabase.com).
2. Grab the API configuration details (Project URL, `anon` public key, and `service_role` private key).
3. Apply migrations in order against the remote DB.
   - *Option A (CLI)*:
     ```bash
     npx supabase login
     npx supabase db push --db-url postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
     ```
   - *Option B (Direct Panel)*: Paste migrations `001_initial.sql` through `027_org_model_audit.sql` sequentially inside the Supabase SQL Editor.

#### 3. Setup Environment Variables
Create `.env.local` based on `.env.example`:
```bash
cp .env.example .env.local
```
Fill in the following:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ_anon_public_key_placeholder_xxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJ_service_role_key_placeholder_xxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk_test_anthropic_api_key_xxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSy_gemini_api_key_placeholder_xxxxxxx
VAULT_INTERNAL_SECRET=your_32_byte_hex_secret_placeholder
RESEND_API_KEY=re_resend_api_key_placeholder_xxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@your-domain.com
UPSTASH_REDIS_REST_URL=https://your-database-id.upstash.io
UPSTASH_REDIS_REST_TOKEN=upstash_redis_token_placeholder_xxxxxxx
```

#### 4. Configure Authentication Providers
Inside Supabase Console → Authentication → Providers:
- **Email**: Enable, toggle **Magic link** on.
- **Google OAuth**: Enable, specify Client ID and Client Secret generated in Google Cloud Console. Set Redirect URL to `http://localhost:3000/auth/callback`.

#### 5. Local Dev Execution
```bash
npm run dev
```

### High-Level Project Structure
```
vaultx/
├── app/
│   ├── (auth)/login/          # Login Page (Magic Link + Google OAuth)
│   ├── (dashboard)/           # Protected Application Console
│   │   ├── layout.tsx         # Responsive Sidebar + Navigation
│   │   └── dashboard/
│   │       ├── ctf/           # Capture The Flag Competition Board (Week 13)
│   │       │   ├── loading.tsx               # CTF List Loader [NEW]
│   │       │   └── [id]/
│   │       │       ├── loading.tsx           # CTF Info Loader [NEW]
│   │       │       └── play/
│   │       │           └── loading.tsx       # CTF Challenge Console Loader [NEW]
│   │       ├── contests/      # Code4rena-Style Audit Contests Board (Week 14)
│   │       │   ├── loading.tsx               # Contests List Loader [NEW]
│   │       │   └── [id]/
│   │       │       ├── loading.tsx           # Contest Console Loader [NEW]
│   │       │       └── judge/
│   │       │           └── loading.tsx       # Judge Dashboard Loader [NEW]
│   │       ├── ai-red-team/   # AI Autonomous Scanning Module (Week 11)
│   │       │   ├── loading.tsx               # Red Team Scans List Loader [NEW]
│   │       │   └── [id]/
│   │       │       └── loading.tsx           # Scan Progress & Thinking Logs Loader [NEW]
│   │       ├── code-quality/  # Static Code & Smart Contract Audit Console (Weeks 6/12)
│   │       ├── org/           # Org-Only Program & Submissions Triage (Weeks 2/5/6)
│   │       ├── ptaas/         # Pentesting Engagements & Report Gen (Week 10)
│   │       │   ├── loading.tsx               # Engagements List Loader [NEW]
│   │       │   └── [id]/
│   │       │       └── loading.tsx           # Report Dashboard & Document Loader [NEW]
│   │       └── researcher/    # Researcher Dashboard, Submissions, Earnings (Week 3)
│   ├── auth/callback/         # Supabase Auth Callback Route
│   ├── onboarding/            # Profile Onboarding & Role Selection (Org vs Researcher)
│   └── page.tsx               # Animated Platform Landing Page (Week 8)
├── components/
│   ├── command/               # CommandPalette component (⌘K quick navigation, Week 8)
│   ├── ctf/                   # Competition panels, Timers, Flag Submitters (Week 13)
│   ├── contests/              # Duplicate Panels, Status controls, Payout tables (Week 14)
│   ├── code-quality/          # Solidity Web3AuditButton (Week 12)
│   ├── feedback/
│   │   └── loading-states.tsx # Skeleton loading state block reference code
│   ├── layout/                # Sidebar, MobileSidebar, Header Elements
│   ├── providers/             # Client context wrappers, CommandPaletteProvider (dynamic lazy-loading)
│   ├── ptaas/                 # EngagementStatusControl, Findings panels
│   ├── red-team/              # AggressionBadge, ReasoningTrace view components
│   └── ui/                    # StatCard, CopyButton, Modal Dialogs, skip-to-content.tsx, badge.tsx [NEW], form.tsx [NEW], page-header.tsx [NEW]
├── lib/
│   ├── design-system.ts       # Unified Design tokens [NEW]
│   ├── use-form-error.ts      # Custom form validation hooks [NEW]
│   ├── ai/                    # Multi-Provider (claude.ts), Smart Contract Audit (Week 12), Contest Judge/Distribution (Week 14)
│   ├── github/                # Repo file client with Solidity filters (Week 12)
│   └── supabase/              # Supabase Client, Server, and TS Types
├── supabase/
│   └── migrations/            # SQL Schemas (001_initial.sql to 027_org_model_audit.sql)
├── middleware.ts              # Auth protection + role routing
├── wrangler.jsonc             # Cloudflare Pages Deployment Configuration
├── package.json               # Package Manifest & Scripts
└── tsconfig.json              # TypeScript Options (excludes backup test paths)
```

---

## 2. FINAL PLATFORM DEFINITION

### What the Platform Does
- **Unified Security Triage**: Ingests open bug bounty and VDP submissions, runs automatic multi-engine deduplication, assesses severity, and displays findings.
- **Code Auditing (Web2 & Web3)**: Scans public GitHub repositories for OWASP Top 10 vulnerabilities, code quality smells, and Solidity gas/reentrancy patterns.
- **PTaaS Lifecycle Management**: Schedules time-boxed pentests, generates test plans, tracks finding states, and compiles executive summaries.
- **Autonomous AI Red Teaming**: Simulates threat actors against a repository or scope description with reasoning logs and findings fed directly to the triage queue.
- **Role-based Authentication**: Keeps Org data isolated, Researchers restricted to their submissions/leaderboard, and Triagers focused on review.

### What the Platform Does NOT Do
- **Auto-Payment Execution**: Suggests reward payouts, but restricts actual balance transfers or transaction signatures to human authorization.
- **Full Git Hosting**: Integrates with GitHub via API, but does not duplicate or store private repository codebases on disk.
- **Vulnerability Auto-Patching**: Locates flaws, but does not commit auto-generated pull requests directly to master branches.

---

## 3. COMPLETE FEATURE & FUNCTION SYSTEM

```mermaid
graph TD
    A[VAULTX Platform] --> B[Org Console]
    A --> C[Researcher Portal]
    A --> D[AI Engines]
    
    B --> B1[Program Manager]
    B --> B2[Submissions Triager]
    B --> B3[PTaaS Coordinator]
    
    C --> C1[VDP / Bug Bounty Submissions]
    C --> C2[Code Quality Scans]
    C --> C3[Leaderboard & Reputation]
    
    D --> D1[Submission Validator]
    D --> D2[Code & Web3 Audit]
    D --> D3[Red Team Scanner]
```

### Module 1: Organization Dashboard & Program Management
* **Program Setup Wizard**: Form to configure VDP or Bug Bounty scope (in-scope, out-of-scope arrays, rewards, timelines).
* **Triage Worklist**: Visual board tracking reports. Supports moving reports through states (`new` → `triaging` → `accepted` / `duplicate` / `rejected`).
* **Reward Approval Gating**: Org users propose bounty payouts. The database rejects any payout changes lacking a valid, human `approved_by` ID.

### Module 2: Researcher Submission & Earnings
* **Multi-Step Report Ingestion**: Guided flow (Title, Description, Steps to Reproduce, Impact, Severity self-assessment) with secure attachment upload.
* **Reputation & Leaderboard**: Calculated using accepted submission numbers and total payouts, excluding profiles configured as system AI agents.

### Module 3: Multi-Engine Deduplication & AI Severity Assessment
* **Deduplication Chain**: 
  1. *Exact Hash*: SHA-256 fingerprint comparison of submission body.
  2. *Fuzzy Text Match*: Trigram indexing (`pg_trgm`) checks title/body similarities.
  3. *AI Semantic Evaluation*: Claude/Gemini compares finding locations and root causes.
* **AI Severity Classification**: Generates a predicted severity and confidence score based on CVSS v3.1 parameters.

### Module 4: Code Quality & Web3 Smart Contract Audits
* **Static Repo Scanning**: Ingests public repositories via unauthenticated API, running prompt-wrapped security and syntax analysis.
* **Web3/Solidity Specialization**: Extends scanners to check smart contracts for reentrancy, overflow, oracle manipulation, and gas inefficiencies.
* **Deterministic Anti-Pattern Detection**: A dedicated static-analysis pass (`lib/ai/anti-patterns.ts`) runs alongside the AI review — zero AI cost, fully reproducible — catching god objects/oversized files, deep nesting, empty catch/bare-except blocks, long parameter lists, debug leftovers (console.log/debugger), TODO/FIXME density, and cross-file duplicated code blocks. Findings are tagged `source: "static"` vs `source: "ai"` in the UI so it's clear which pass caught what. Runs independently of the AI call, so anti-pattern findings still surface even during a full AI provider outage.

### Module 5: Penetration Testing as a Service (PTaaS)
* **Engagements Coordinator**: Creates scheduled pentests with goals. Uses AI to draft structured test plan task lists.
* **Executive Summary Generator**: Aggregates logged findings into structured JSON report sections with remediation advice.
* **Native Signed PDF Export**: Generates a downloadable PDF report on demand via `pdf-lib` (pure JS, no headless-browser dependency — runs under Cloudflare's Workers runtime). Each export is SHA-256 hashed; the hash is embedded in the PDF footer and stored on the report record so a recipient can verify the file hasn't been altered since VAULTX generated it. This is content-integrity signing, not a PKI certificate.

### Module 6: Autonomous AI Red Team
* **Aggressive Scanning Agent**: Orchestrates security scans against targets with three aggression tiers. Shows step-by-step thinking logs.
* **Auto-Triage Routing**: Translates discovered weaknesses into submission rows, marked as generated by system AI agents.

### Module 7: Capture The Flag (CTF) Competitions
* **Competition Orchestrator**: Org users create draft/active/ended competitions, defining starts_at/ends_at and publicity.
* **Challenge Board**: Multi-category Jeopardy-style puzzles (web, crypto, reverse, pwn, forensics, misc, smart_contract, cloud) across four difficulties. Supports point configuration, hints with penalty costs, and attachment files.
* **Dynamic Decay Solver**: Rewards early solver speeds by dynamically decaying points on subsequent solves.
* **Hashed Verification Endpoint**: Validates submitted flags via SHA-256 comparison and recomputes the scoreboard. Logs wrong attempts to apply endpoint rate limiting.

### Module 8: Code4rena-Style Audit Contests
* **Contest Coordinator**: Organizations establish scheduled contests with a committed, upfront fixed bounty pool.
* **Smart Contract Auditor Submissions**: Auditors submit detailed findings targeting specific lines and files in connected repository scopes.
* **AI Duplicate Grouper**: Automatically analyzes new submissions during the judging phase and pre-groups them semantically based on root causes, accelerating human review.
* **Pool Payout Calculator**: Implements the Code4rena model (shares = severity_weight / duplicate_count) to fairly distribute rewards, ensuring duplicate findings split the pool instead of getting rejected. Severity weights: Critical=10, High=5, Medium=2, Low=0.5, Info=0.

### Module 9: Public API
* **API Key Authentication** (`lib/api/auth.ts`): Validates `Authorization: Bearer vx_...` headers against the existing key store from Settings → API Keys. Keys were being issued and documented before this module existed, but nothing on the server validated them — this is what makes those keys actually functional.
* **Endpoints**: `GET/POST /api/v1/submissions`, `GET /api/v1/programs`, `GET /api/v1/rewards`, `GET /api/v1/reports` — each gated by one of the five existing scopes (`read:submissions`, `write:submissions`, `read:programs`, `read:rewards`, `read:reports`). Submission creation reuses the exact dedup (SHA-256 exact + pg_trgm fuzzy) and AI validation pipeline as the dashboard form, not a simplified copy.
* **Rate Limiting** (`lib/api/rate-limit.ts`): Per-key Upstash-backed limits (100 req/hr reads, 20 req/hr writes), same fail-open pattern as the existing submission rate limiter — a Redis outage degrades to unlimited rather than blocking the API entirely.
* **Docs**: `/docs/api` — public reference page covering auth, rate limits, and every endpoint.
* **Known gap, not fixed here**: the underlying key hash (`app/actions/settings.ts`) is a single unsalted SHA-256, not the salted double-hash described in migration 012's comments for a separate, currently-unused `public.api_keys` table. Low practical risk given keys are 32 random bytes (high entropy), but worth migrating to the salted scheme in a future hardening pass.

### Module 10: GitHub App Integration (Private Repos)
* **Auth primitives** (`lib/github/app-auth.ts`): RS256 JWT signing via Web Crypto and installation-token exchange. Enables code quality scans and Web3 audits to authenticate as a specific org's GitHub App installation instead of only hitting GitHub's unauthenticated public API.
* **Install flow** (`app/api/github/install-callback/route.ts`): Handles GitHub's redirect after a user installs the App, persisting the installation record (`github_installations`, migration 016) scoped to the org owner. Distinguishes a completed install from a pending admin-approval request (`setup_action=request`).
* **Private repo scanning, end to end**: `lib/github/client.ts`'s `fetchRepoTree`/`fetchFileContent`/`fetchFiles` now accept an optional installation token — previously only `fetchRepoMetadata` did, so a connected org's private-repo metadata check would pass but the actual tree/file fetch immediately after would silently fail. `app/actions/code-quality.ts` resolves the calling org's installation token automatically for both the general scanner and the Web3 auditor.
### Module 11: Performance Engineering CI/CD
Explicitly listed as a hard cut in the original blueprint ("DO NOT BUILD"). Built as a from-scratch addition, not an upgrade of any prior partial work.
* **`.github/workflows/performance-ci.yml`**: Runs on every PR into main. Builds the plain Next.js output (not the Cloudflare Worker bundle — irrelevant overhead for this check), serves it locally, and runs both a bundle-size budget check and Lighthouse CI against it.
* **`scripts/check-bundle-size.js`**: Parses Next.js's own build manifest to enforce a per-route First Load JS budget (300 KB default, with named exceptions for routes with justified extra weight, e.g. the PTaaS report panel pulling in `pdf-lib`). This is static analysis of build output, so it covers every route including authenticated dashboard pages — unlike the Lighthouse step below.
* **`lighthouserc.json`**: Lighthouse only runs against the landing page and `/docs/api` — the only unauthenticated routes a CI runner can render without live Supabase credentials. Enforces performance ≥ 0.85, accessibility ≥ 0.90, plus Core Web Vitals thresholds (LCP ≤ 2.5s, CLS ≤ 0.1).
* **Honest scope limit**: this does not performance-test the authenticated dashboard itself (submissions list, PTaaS engagement pages, etc.) — doing that in CI would require seeding a real or mocked Supabase instance with test data and a way to authenticate a headless browser, which is a meaningfully larger effort than "add Lighthouse to CI." Flagging this rather than implying broader coverage than what's actually running.

### Module 12: Stripe Connect Payouts (Complete — Batches 1 & 2)
Requested as a full 12-feature build, delivered across two batches given the scope and the fact that this touches real money movement.

**Batch 1 (core):**
* **Migration 017**: purely additive — does not touch the `reward_status` enum or the `enforce_human_reward_approval` trigger from migration 001.
* **`lib/stripe/client.ts`**: Express Connect account creation, onboarding links, and transfers. Every transfer requires an idempotency key — a retried request can never create a duplicate real transfer.
* **Researcher onboarding**: `app/actions/stripe-connect.ts`, `/api/stripe/onboarding-return`, Stripe status card on the Earnings page.
* **`markRewardPaid` now moves real money** via `stripe.transfers.create`, but every existing guard (org-owner-only, `status === 'approved'` required) is untouched — it still never sets a reward to approved, only ever acts on rewards that already cleared that human-gated transition.
* **Real bug found and fixed**: `components/rewards/reward-widget.tsx` — the entire propose/approve/pay UI — was built but never rendered on any page. Wired into the org submission detail page; without this, none of the reward/payout logic was reachable by a human.

**Batch 2 (remaining 8 features):**
* **Migration 018**: `reward_splits` table, `profiles.minimum_payout_threshold`, `rewards.held_for_threshold`, `payout_fraud_flags` — all additive.
* **Minimum payout threshold**: `markRewardPaid` now pools a researcher's cumulative unpaid-approved rewards (same currency) and only transfers once the pool crosses their threshold ($50 default), combining everything held into one transfer rather than many small ones. Split-configured rewards are excluded from pooling by design — combining per-researcher threshold pooling with multi-recipient splitting on one reward would be a meaningfully larger feature for uncertain benefit.
* **Payout splitting**: `proposeSplitReward()` + `paySplitReward()` — each split recipient gets their own transfer with its own idempotency key, so a partial failure (one recipient's Stripe not connected) can be retried without re-paying recipients who already succeeded.
* **Batch payouts**: `batchPayRewards()` + a "Pay all approved" button on the org rewards page. Runs sequentially, not concurrently — concurrent calls risk the same researcher's rewards being pooled twice by two overlapping reads of stale state.
* **Failed payout handling**: retry cap (5 attempts, then blocked with a clear message), org-owner email alert on every failure (`notifyPayoutFailed`), researcher email receipt on every success (`notifyPayoutSucceeded`).
* **Admin payout audit log**: `/dashboard/org/payouts` — reads directly from the existing immutable `audit_logs` table (migration 001). No new logging mechanism; this is a dedicated view over data that was already being written.
* **Fraud detection**: `lib/stripe/fraud.ts` scans for researchers whose connected Stripe accounts share a bank account fingerprint — a real signal from Stripe's own data, not a fabricated ML model. Deliberately narrow in scope; a genuine payments fraud system (velocity checks, device fingerprinting, behavioral scoring) is its own project, not something to imply coverage of here.
* **Multi-currency**: `lib/currency/convert.ts` provides a live USD-equivalent estimate (via frankfurter.app, free/keyless, ECB reference rates) for display purposes only — it does not affect what Stripe actually transfers. Stripe handles real cross-currency conversion itself at payout time using its own live rates; duplicating that logic here would risk the displayed estimate silently drifting from what the researcher actually receives.
* **Tax form collection — deliberately not built as a separate custom flow**: Stripe's own Express onboarding (already live in Batch 1) collects identity, banking, and tax information (W-9/W-8BEN equivalents) as part of its standard hosted KYC flow — `stripe_payouts_enabled` only becomes true once Stripe's own requirements are satisfied, which already gates the first payout on this being complete. Building a parallel custom tax-form collector would mean VAULTX itself handling and storing raw SSNs/TINs directly, which is a serious compliance liability for a zero-budget platform to take on when Stripe already solves it. Flagging this as a deliberate design decision, not a shortcut.

### Module 13: Custom Reporting Builder
Requested as a 15-feature build; all 15 implemented in one pass since the metrics engine, filters, and chart rendering share one clean core that the remaining features (export, scheduling, embed, anomalies) layer onto directly.
* **Migration 019**: `report_templates` (saved builder configs, optional public embed token) and `scheduled_reports` (recurring email delivery), both additive.
* **`lib/reports/metrics.ts`**: nine metrics — bugs submitted/resolved, severity distribution, payout totals, avg response time, researcher activity, researcher leaderboard, program cost-per-finding, SLA compliance — all computed from one shared `ReportFilters` shape so the live builder, the public embed route, and the scheduled-report cron all produce identical numbers from identical inputs.
* **Two labeled approximations, not silently overclaimed**: "avg response time" and SLA compliance use `updated_at - created_at` as a proxy for first-triage response time, since no dedicated "first response" timestamp exists in the schema — genuinely approximate, not exact SLA timing. "Program ROI" is actually total payout ÷ valid findings (a cost-per-finding proxy) — there's no real revenue figure anywhere in this schema to compute true financial ROI against.
* **Builder UI** (`/dashboard/org/reports`): metric picker, chart type (bar/line/pie; scatter falls back to bar since the underlying data is label/value pairs, not true x/y numeric pairs), date presets + custom range, severity/program/researcher filters, comparison mode (current vs. prior period, side-by-side), one-click presets for Executive Summary / Researcher Leaderboard / SLA Compliance.
* **Anomaly highlights** (`lib/reports/anomaly.ts`): standard-deviation based (>2σ from series mean) — a real, explainable statistical signal, not a machine-learning model, appropriate for a feature where a human needs to understand *why* something was flagged.
* **Export**: CSV (client-side, no dependency) and PNG (SVG-to-canvas serialization of the actual rendered recharts output, also no extra dependency — avoided pulling in html2canvas/dom-to-image for something achievable natively since recharts renders pure SVG).
* **Embed links**: `/r/[token]` — public, unauthenticated, outside the `(dashboard)` route group entirely. Deliberately restricted to four metrics (bugs submitted/resolved, severity distribution, payout totals) even if the source template includes others — researcher leaderboard and activity are excluded from every embed regardless of template config, since a client-facing public link shouldn't expose which named researcher found what or their individual earnings.
* **Scheduled reports**: `.github/workflows/scheduled-reports-cron.yml` + `/api/cron/scheduled-reports`, reusing the exact `x-vault-secret` header auth and GitHub Actions schedule pattern already established by `red-team-cron.yml` — no new infrastructure pattern introduced. Emails a text/list summary rather than embedding rendered charts, since that's more reliable across email clients than shipping SVG in an email and avoids a server-side chart-rendering dependency for a job that runs at most twice a month.

### Module 14: VAULT — Full AI Agent Persona
Requested as ~24 distinct capabilities across two personas. Built as one unified, context-aware, streaming chat engine with two system prompts, rather than 24 separate hardcoded code paths — this is more maintainable and is how a single conversational agent should actually work, but it means most capabilities are persona/prompt-driven rather than individually coded functions. Two exceptions got dedicated, non-conversational implementations because they need real data, not just good prompting: **duplicate checking** (already existed platform-wide via the exact-hash + pg_trgm fuzzy pipeline in `app/actions/submissions.ts` — VAULT doesn't reimplement this) and **"ask your data"** (below).
* **Real streaming, not a fake typewriter effect**: `streamClaude()` added to `lib/ai/claude.ts` — the same multi-provider chokepoint every other AI call in this platform goes through, extended rather than bypassed. Claude streams via SSE parsing of `content_block_delta` events; Gemini fallback only triggers if the Claude request fails *before* any chunk reached the client — once a stream has started, silently switching providers mid-response isn't possible without confusing whatever's consuming it, so a failure after that point surfaces as an inline error message instead.
* **Two personas, one engine**: `lib/ai/vault-agent.ts` holds both system prompts (researcher: scope/severity/quality guidance; admin: triage summaries, response drafting, workload). Both explicitly state VAULT cannot approve rewards or set final severity — advisory only, matching invariant #1. Role is read server-side from the authenticated session, not client-supplied, so a researcher can't get the admin system prompt by editing a request.
* **Context-awareness**: `components/vault/vault-context.tsx` (React context) + `VaultContextSetter` (a client shim droppable into any server component page) let a page register what's being viewed — currently wired into the org submission detail page. `gatherContextData()` in the agent then pulls real submission/program data into the system prompt, wrapped in `[DATA]` per the platform's prompt-injection convention (invariant #3).
* **"Ask your data"**: admin-only, keyword-routed (cheap, explainable — no extra AI call just to classify intent) to the exact same `lib/reports/metrics.ts` functions the reporting builder uses via `computeReport()`. A chat answer about bug counts or payout totals can never disagree with the dashboard report, because it's computing from the identical function.
* **Conversation history**: `vault_conversations`/`vault_messages` (migration 020), full session persistence, a history panel in the widget to resume past conversations.
* **UI**: floating avatar (animated teal→lime gradient, bottom-right, present across the whole dashboard via the shared layout), markdown rendering (`react-markdown` + `remark-gfm` for tables — added as new dependencies since neither existed in the stack), role-specific quick-action prompts.
* **What's prompt-driven rather than a dedicated function, stated plainly**: severity estimation, report quality scoring, scope checking, triage summarization, response drafting, and pattern-spotting are all handled by VAULT reasoning over the context/persona rather than separate deterministic code paths. This is the right architecture for a conversational agent, but it does mean their quality depends on the underlying model's reasoning in the moment, not a fixed formula — worth knowing going in, not discovering later.

---

### Verification Pass (post-Module 14)
Ran the actual migration chain (001→020) against a real Postgres instance, ran `tsc --noEmit`, and ran `next lint` — not a code-review pass, an execution pass. Found and fixed real bugs:
* **Deployment-blocking bug, pre-dates this session entirely**: migration `011_audit_contests.sql` declared `create type finding_status` — but migration `007_ptaas.sql` (Week 10) already created an enum with that exact name for a completely different concept (PTaaS finding lifecycle vs. contest finding lifecycle). This would have failed on `011` on any fresh database, blocking every migration after it — meaning 012 through 020, everything built this session included, could never have been applied to a clean project. Renamed the contest-specific enum to `contest_finding_status`; no application code referenced the type name directly, so this was a safe, contained fix.
* **6 real TypeScript errors from this session's code**, all fixed: three `unknown`-typed values rendered directly in JSX conditionals (`{after.reason && ...}` where `after: Record<string, unknown>` — fixed by wrapping in `Boolean()` so the conditional has a valid boolean type instead of `unknown`), and two `Uint8Array<ArrayBufferLike>` vs. `BufferSource`/`ArrayBuffer` mismatches from newer TypeScript lib.dom typings (`Uint8Array.from()` and pdf-lib's `.save()` aren't narrowed to a concrete `ArrayBuffer`-backed type the way `new Uint8Array(length)` is) in the push notification subscription and the PDF integrity hash.
* **`npm run lint` had never actually worked** — `eslint`/`eslint-config-next` were devDependencies and a `lint` script existed, but no `.eslintrc.json` was ever committed, so running it just prompted for interactive setup. Added a standard `next/core-web-vitals` config. Once it could actually run, it surfaced real (mostly pre-existing, mostly unescaped-quote) issues across dozens of files from earlier weeks — fixed the 2 files this session touched (`reward-widget.tsx`, `docs/api/page.tsx`), left the pre-existing project-wide backlog as a reported inventory rather than silently bulk-editing unrelated files outside this session's scope.
* **Confirmed NOT a bug, checked rather than assumed**: the Supabase client is typed as `SupabaseClient<Database, "public", any>` — the `any` schema parameter means `.from()` calls against tables missing from `lib/supabase/types.ts` (which is true for most tables added since migration ~006, not just this session's) don't actually fail type-checking. Worth knowing that `types.ts` is significantly out of date with the real schema, but it isn't currently causing build failures.

### Module 15: VAULT Agent Mode
Design doc: `vault-agent-mode-design.md`. Confirm-before-execute layer — VAULT proposes an action, a user explicitly confirms, only then does anything execute. No parallel privileged code path: every action is a thin wrapper around a server action that already exists and was already correctly permission-checked.
* **Migration 021**: `vault_actions` — tracks every proposal and its execution outcome, separate from but complementary to the platform's existing `audit_logs` (executions write to both).
* **Migration 022**: `profiles.vault_agent_mode_enabled` / `vault_agent_consent_at` — a durable, per-user, re-visitable toggle (Settings → Privacy → "AI Assistant") rather than a recurring consent dialog, matching the design doc §9. Checked server-side in *both* the proposal path (chat route) and the execution path (execute-action route) — defense in depth, not just a prompt instruction the model could ignore.
* **5 actions live** (`lib/ai/vault-actions.ts`): `trigger_code_scan`, `trigger_web3_audit`, `generate_ptaas_report`, `trigger_red_team_scan`, `request_more_info` — each gated to the roles that already pass the wrapped function's own auth check, not a new permission tier. `request_more_info` wraps the existing triage `requestMoreInfo()`, giving VAULT's "response drafter" capability an actual send path — deliberately the *only* triage function wrapped; `acceptSubmission`/`rejectSubmission`/`markResolved`/`markWontFix`/`markDuplicate` are verdict decisions, closer in spirit to the reward-approval invariant than to "regenerate a PDF," and were left un-wrapped on purpose.
* **`lib/ptaas/report-generation.ts`**: extracted from the existing PDF download route specifically so the button and VAULT's action call the identical function — proving the "no parallel path" rule rather than just stating it.
* **Command palette integration** (design doc §8): role-aware VAULT entries in the existing ⌘K palette, opening the widget with a pre-filled prompt via a small custom DOM event rather than a larger shared-state refactor — a deliberately minimal integration point.
* **Persistent trust indicator** (design doc §8): every successfully executed action's card permanently shows "Executed by you via VAULT · [timestamp] · logged to your audit history," not a toast that disappears.
* **Streaming + structured actions, solved**: the model emits an optional trailing ` ```vault-action ` fenced JSON block; the chat route buffers and stops forwarding to the client the instant that fence starts (so raw JSON never flashes in the transcript), validates it server-side against the role allow-list, and only a validated action reaches the client as a distinct Action Preview card — never as chat text.
* **Two real bugs found by running `tsc --noEmit`, not by review**: the client-side `VaultContextShape` type was missing fields I'd only added server-side, and a context-setter component was placed inside a nested render helper where its variable wasn't actually in scope. Both are exactly the kind of small, easy-to-miss error a real compiler run catches and a code read doesn't.
* **Hard exclusions, by omission not by permission check**: no reward action (`proposeReward`/`approveReward`/`markRewardPaid`) has a wrapper anywhere in this file, and none will — per the design doc, this invariant is enforced by what code doesn't exist, not a check that could be misconfigured.
* **Not yet built, stated plainly**: AI recipes / saved action sequences and scheduled agent actions (design doc §12) — genuine future extensions, not silently dropped scope. Context-awareness is wired into 4 pages (submission detail, code-quality repo detail, PTaaS engagement detail, red team target detail); extending further is mechanical but not exhaustive yet.

---

## 4. SYSTEM ARCHITECTURE



```mermaid
sequenceDiagram
    participant R as Researcher / User
    participant App as Next.js 16 Web App
    participant DB as Supabase (Postgres)
    participant AI as AI Engine (Claude / Gemini Fallback)

    R->>App: Submit Report / Trigger Scan
    activate App
    App->>DB: Check Cache / Calculate Hash & Trigram Matches
    DB-->>App: Hash/Trigram Results
    App->>AI: Call AI Client (Try Claude, Fallback to Gemini on Error)
    activate AI
    AI-->>App: Return Structured JSON Response
    deactivate AI
    App->>DB: Insert Submission / Scan Results & Audit Log
    App-->>R: UI Updates via Realtime WebSocket Channel
    deactivate App
```

### Authentication & Authorization System
- **Supabase Auth**: Mirroring `auth.users` schema to public `profiles` via database trigger functions. Role enforcement (`org`, `researcher`, `triager`, `admin`) validated client-side and server-side via `middleware.ts`.
- **Row-Level Security (RLS)**: Active on all tables. Enforces that organizations can only access their metrics, and researchers can only view their own submissions.

### AI Orchestration & Fallback Client
1. **Request Dispatch**: Core modules call `callClaude(opts)`.
2. **Primary Execution**: Connects to `claude-sonnet-4-6` via fetch. Implements up to 2 retries with exponential backoff on transient errors (e.g., status 429).
3. **Transparent Fallback**: On failure, authenticates using `GEMINI_API_KEY` and translates the system/user instruction to match `gemini-2.0-flash` parameters.
4. **Data Normalization**: Transforms Gemini output to Anthropic's message structure, returning to downstream components without breaking parsing.

### Realtime Synchronization & Event Pipeline
- **Supabase Realtime**: Employs WebSockets to broadcast changes on `submissions` and `notifications` tables.
- **Resend Mail Delivery**: Server actions send email confirmations for triage status updates and reward approvals using Resend.

---

## 5. PRODUCT DOCUMENTATION

### PRD (Product Requirements Document)
* **Vision**: A consolidated security ecosystem where organizations handle vulnerabilities, penetration testing, and code quality audits, assisted by resilient AI triage agents while keeping humans in absolute control.
* **Target Users**:
  - *Organizations*: Security directors, tech leads, and triagers.
  - *Security Researchers*: Ethical hackers, penetration testers, and code auditors.
* **Success Metrics**: Zero unpaid bounty incidents, sub-30 second first-pass triage duration, 100% database-level audit logs integrity, and 99.9% uptime for AI evaluations.

### TRD (Technical Requirements Document)
- **Database (PostgreSQL)**: Utilizes trigram search extensions (`pg_trgm`) and custom PL/pgSQL database triggers for security invariants.
- **Hosting Strategy**: Deployed serverless on Cloudflare Pages using `@opennextjs/cloudflare` bridging.
- **Caching**: Utilizes Upstash Redis REST calls to throttle researcher submission endpoints.

### UI/UX Design System Brief
- **Color Palette**: Modern dark theme using deep slate base backgrounds (`#09090b`), emerald accent colors (`#10b981`), teal highlights (`#2dd4bf`), and clean borders (`#27272a`).
- **Typography**: Configured with Geist Sans (body text) and Geist Mono (reproduce steps, logs, and code snippets).
- **Aesthetics & Motion**: Uses Framer Motion transitions, responsive sidebar panels, layout skeletons to eliminate Cumulative Layout Shift (CLS), and on-demand modal triggers for Command Palette.

### Database Schema Details

```
+------------------+       +-------------------+       +-----------------+
|   profiles       |       |   organizations   |       |   programs      |
+------------------+       +-------------------+       +-----------------+
| id (PK)          |------>| id (PK)           |<------| id (PK)         |
| email            |       | owner_id (FK)     |       | org_id (FK)     |
| role             |       +-------------------+       | status          |
| is_system_agent  |                 |                 +-----------------+
+------------------+                 |                          |
         |                           v                          |
         |                 +-------------------+                |
         +---------------->|    submissions    |<---------------+
                           +-------------------+
                           | id (PK)           |
                           | program_id (FK)   |
                           | researcher_id (FK)|
                           | content_hash      |
                           +-------------------+
                                     |
                                     v
                           +-------------------+
                           |      rewards      |
                           +-------------------+
                           | id (PK)           |
                           | submission_id (FK)|
                           | approved_by (FK)  |
                           +-------------------+
```

#### Core Database Schema DDL Summary
1. `profiles`: Maps users. Includes a boolean column `is_system_agent` to isolate AI red-team scanner actions.
2. `organizations`: Companies managing programs. Relates to `profiles` via `owner_id`.
3. `programs`: Bounty/VDP scope parameters.
4. `submissions`: Researcher vulnerability entries. Includes hash values and AI suggestion classifications.
5. `rewards`: Proposed payouts. Triggers guarantee that `approved_by` is not null when status is changed to `approved` or `paid`.
6. `audit_logs`: Immutable database tracking table. Database triggers throw exceptions on any SQL `UPDATE` or `DELETE` commands.
7. `code_repos` & `code_scans`: Tracks connected public repositories and static evaluation scores. `code_scans` includes a `scan_type` discriminator (`general` or `web3_smart_contract`) to support Solidity-specific audits.
8. `pentest_engagements`, `pentest_findings`, & `pentest_reports`: Houses scheduled pentesting engagements, reported logs, and final summary rollups.
9. `red_team_targets` & `red_team_scans`: Configures AI Red Team scanner targets and reasoning outputs.
10. `ctf_competitions`, `ctf_challenges`, `ctf_solves`, `ctf_wrong_attempts`, & `ctf_hint_reveals`: Database tables and recomputed materialized views (`ctf_scoreboard`) backing Capture The Flag competitions.
11. `audit_contests`, `contest_findings`, & `contest_payouts`: Backs Code4rena-style fixed pool contests, auditor findings, and share-based payout distributions.

---

## 6. IMPLEMENTATION PLAN

### Phase 1: Foundations & Auth (Week 1)
- Scaffold Next.js 14 project.
- Deploy Supabase database and enable RLS rules on core profiles.
- Configure Magic Link and Google OAuth. Integrate role-based routing middleware.

### Phase 2: Program & Submissions Management (Weeks 2-3)
- Deliver program builder and researcher report submission wizard.
- Deploy Upstash Redis rate-limiter for report creation endpoints.
- Seed baseline organizations and scopes.

### Phase 3: AI Validation & Triager Workflows (Weeks 4-5)
- Code the multi-provider client with Gemini backup support.
- Deploy exact hash and trigram similarity deduplication checks.
- Establish Resend notifications pipeline and Supabase Realtime event wiring.

### Phase 4: Financial Governance & Code Diagnostics (Weeks 6-8)
- Implement human-approval trigger rules on rewards.
- Set up connected public repository scanners.
- Design the animated landing pages and register waitlist signups for advanced features.

### Phase 5: Advanced Security Operations (Weeks 10-14)
- Deploy the complete PTaaS engagement builder and PDF rollup engine.
- Establish the AI Autonomous Red Team scanner with thinking traces, and map results to the triage pipeline.
- Deploy Web3 Smart Contract static analysis audits with Solidity SWC weakness classification.
- Deploy Capture The Flag (CTF) competition boards with SHA-256 hashed verification and dynamic CTFd-style scoreboard decay.
- Deploy Code4rena-Style Audit Contests with AI duplicate group suggestions and dynamic pool share payouts.
- Verify production compilation using strict typechecking.

---

## 7. MASTER BUILD PROMPTS

### Prompt 1: Multi-Provider AI Deduplication Client
Use this template to build the multi-provider fallback engine:
```
System Prompt:
You are a security vulnerability deduplication expert for a bug bounty platform.
Your task: Determine whether a NEW submission is a semantic duplicate of any EXISTING submission.

Rules:
- A duplicate means the SAME vulnerability at the SAME location, even if described differently.
- Different attack vectors targeting the same root cause = duplicates.
- Same vulnerability type at DIFFERENT endpoints = NOT duplicates.
- Superficially similar topics but different issues = NOT duplicates.

Respond ONLY with valid JSON. No preamble, no markdown, no explanation outside JSON.
{
  "isDuplicate": boolean,
  "duplicateId": string | null,
  "similarity": number (0.0 to 1.0),
  "reasoning": string (max 150 chars)
}

User Prompt:
NEW SUBMISSION:
[DATA]
Title: {{newTitle}}
Description: {{newDescription}}
[/DATA]

EXISTING SUBMISSIONS TO COMPARE AGAINST:
[DATA]
{{candidatesBlock}}
[/DATA]
```

### Prompt 2: Severity Classification & CVSS Suggestion
Use this template to classify vulnerability severity:
```
System Prompt:
You are a senior security engineer performing vulnerability triage for a bug bounty platform.
Classify vulnerability severity using CVSS v3.1 principles:
- critical: CVSS 9.0–10.0 — RCE, auth bypass at scale, mass data breach.
- high:     CVSS 7.0–8.9  — significant data exposure, privilege escalation, SSRF.
- medium:   CVSS 4.0–6.9  — limited scope XSS, CSRF, info disclosure.
- low:      CVSS 1.0–3.9  — minor issues, rate limiting, self-XSS.
- info:     CVSS 0.0–0.9  — best practice, informational.

Respond ONLY with valid JSON. No preamble, no markdown.
{
  "severity": "critical" | "high" | "medium" | "low" | "info",
  "confidence": number (0.0 to 1.0),
  "reasoning": string (max 200 chars),
  "cvssHints": string[]
}
```

### Prompt 3: AI Red Team Target Scan & Reasoner
Use this template to execute autonomous red-team exercises:
```
System Prompt:
You are an advanced, autonomous AI Red Team agent scanning a target scope.
Your goal is to simulate realistic attacker methodology (recon, analysis, exploit planning, execution analysis) and log findings.
Generate a JSON array of step-by-step thinking traces alongside discovered vulnerability findings.
```

### Prompt 4: Web3 Smart Contract Static Auditor
Use this template to audit Solidity smart contracts:
```
System Prompt:
You are a senior smart contract security auditor with expertise in Solidity and EVM-based contracts. You have deep knowledge of the SWC (Smart Contract Weakness Classification) Registry and common DeFi attack patterns.

Perform a security-focused static analysis of the provided Solidity contracts. Think like an attacker: look for exploitable paths, not just code style.

VULNERABILITY CATEGORIES TO CHECK (systematic, in order of typical severity):
1. Reentrancy (SWC-107) — external calls before state updates, missing CEI pattern
2. Integer overflow/underflow (SWC-101) — unchecked arithmetic, missing SafeMath or Solidity 0.8+
3. Access control (SWC-105, SWC-106) — missing onlyOwner/role checks, tx.origin auth, constructor visibility
4. Oracle manipulation — price oracle reliance on single source, flash loan attack vectors
5. Front-running (SWC-114) — MEV-exploitable state changes, race conditions in commit-reveal
6. Denial of Service — block gas limit DoS, unexpected revert in loops, push-over-pull pattern
7. Timestamp dependence (SWC-116) — block.timestamp in critical logic
8. Unchecked return values (SWC-104) — low-level call() without return check
9. Delegatecall risk (SWC-112) — storage layout conflicts in proxy patterns
10. Hardcoded addresses, self-destruct vectors, insecure randomness (SWC-120)

SCORING:
- Start at 100.
- Critical: -25 per finding
- High: -15 per finding
- Medium: -8 per finding
- Low: -3 per finding
- Info: -0 (notes only, no deduction)
- Minimum score: 0

Respond ONLY with valid JSON. No preamble, no markdown.

JSON schema:
{
  "score": number (0-100),
  "summary": string,
  "contractsAnalyzed": string[],
  "findings": [
    {
      "swcId": string | null,
      "category": string,
      "title": string,
      "description": string,
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "file": string,
      "line": number | null,
      "codeSnippet": string | null,
      "recommendation": string
    }
  ]
}
```

---

## 8. ERRORS & MISTAKES TO AVOID

### Developer Traps & Security Pitfalls
- **Incorrect Key Exposure**: Never prefix the Supabase Service Role Key with `NEXT_PUBLIC_`. Doing so bypasses all database RLS checks and exposes administrative read/write access to user browsers.
- **Client Components Event Handlers**: In Next.js App Router, do not use client-side event handlers (like inline `onClick` copy functions) inside Server Components. Always modularize interactive elements (like clipboard copy buttons) into separate `"use client"` components to prevent compile failures.
- **In-Memory Caches in Edge Hosting**: Do not rely on local variables (like in-memory Javascript Maps) to track rate limits in edge functions. These limits will reset on every serverless invocation. Use Upstash Redis for distributed state caching.

### Prompt Injection Protections
- **Wrap Input Content**: Never interpolate researcher-supplied text directly into system instruction prompts. Always frame user inputs inside `[DATA]...[/DATA]` delimiters and sanitize the variables to strip out escape strings (like `[/DATA]` or `[SYSTEM]`).

---

## 9. IMPROVEMENTS & FUTURE UPGRADES

- **Stripe Connect Payout Integration**: Automate the transfer of accepted bounties from the org's card balance to the researcher's connected account once the human approval trigger updates the status.
- **GitHub App Integration**: Support private repository auditing by letting organizations authorize a secure GitHub App to generate temporary read-tokens for static scans.
- **Native PDF Export**: Compile the pentest rollups into downloadable, signed security PDFs using serverless layout rendering.

---

## 10. DEPLOYMENT & OPERATIONS GUIDE

### Production Deployment Runbook
1. **Host Configuration**: Register a project in Cloudflare Pages. Point the build settings to:
   - Framework preset: `Next.js` (compiled for Cloudflare Workers/Pages V8 isolate environment via Wrangler)
   - Build command: `npm run build`
   - Build output: `.next`
   - Compatibility setup: Wrangler uses `wrangler.jsonc` to inject the V8-compatible Node.js standard libraries polyfill (`nodejs_compat` compatibility flag) directly into the edge sandbox. Native Node.js filesystem modules (like `fs`) cannot be resolved.
2. **Domain Mapping**: Attach your custom domain in the Pages panel. Universal SSL will auto-provision. Ensure `NEXT_PUBLIC_APP_URL` matches this domain exactly.
3. **Database Sanity Verification**: Run this query inside the Supabase SQL editor to ensure Row-Level Security is active on all public tables:
   ```sql
   select tablename, rowsecurity from pg_tables where schemaname = 'public';
   ```
   *Expected: Every row must return `rowsecurity = true`.*
4. **Active Uptime Checking**: Configure monitors on UptimeRobot for:
   - Dashboard index page: `https://your-domain.com`
   - AI API endpoint: `https://your-domain.com/api/ai/validate-submission`
5. **Email Domain Configuration**: Configure sending domains in Resend (or your chosen provider) to ensure reliable Magic Link authentication delivery:
   - *SPF (TXT record)*: Add `v=spf1 include:providers.resend.com ~all` on your sending subdomain/domain.
   - *DKIM (CNAME records)*: Map the three dynamic CNAME records provided in the Resend console (e.g. `resend1._domainkey` pointing to `dkim1.resend.com`).
   - *DMARC (TXT record)*: Setup `_dmarc` with a quarantine monitoring policy: `v=DMARC1; p=quarantine; pct=100;`.
   - Verify active status in the provider domains panel before launching user access.
6. **Attachment Storage Configuration**: Configure secure private attachment storage for submission evidence:
   - Run the migration file `supabase/migrations/013_attachments.sql` in the Supabase SQL Editor.
   - This creates a private `attachments` bucket with a 10MB size limit and allowed safe MIME types (`image/*`, `application/pdf`, `.json`, `.txt`).
   - Row-level security (RLS) policies are automatically configured to restrict access to the file owner (researcher) and the program owner (organization members).
7. **Push Notifications Configuration**: Native browser/OS push notifications are live (migration `014_push_notifications.sql`). Setup: generate a VAPID key pair (`npx web-push generate-vapid-keys`), set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in your environment, and users opt in via the toggle at Settings → Notifications. Delivery is handled server-side by `lib/notifications/push.ts` and fired automatically alongside every existing in-app/email notification event in `lib/notifications/service.ts` — no per-event wiring needed. Dead subscriptions (revoked permission, cleared browser data) are pruned automatically on 404/410 responses from the push service.
8. **Retry and Backoff Configuration (Cloudflare Safe)**: To comply with Cloudflare Workers' 30-second hard execution limits, VAULTX enforces bounded retry parameters on all third-party API clients. Ensure the primary AI client (`lib/ai/claude.ts`) and any new endpoints maintain:
   - Maximum retry attempt cap set to `1` (plus initial try).
   - Single-request fetch timeout bound to `10s` (using AbortControllers).
   - Flat/exponential backoff delays capped at `500ms`.
   - Capping total serial request durations under `25s` to provide a safety margin before Cloudflare 524 timeouts occur.
9. **Multi-AI Normalization & Schema Reliability**: The fallback client parses external structures defensively. API versions are strictly pinned (`anthropic-version` header for Claude, `/v1beta/` resource URL for Gemini). If you update endpoints or models, verify that the parsed response matches the `AIMessage` contract structure, and test failover paths locally before deploying changes.
10. **AI Output Validation & JSON Safety**: All AI modules generating structured data (e.g. PTaaS test plans or vulnerability summaries) parse responses defensively. Enclose JSON decoding logic in `try-catch` structures. Validate the parsed payloads against typed schemas (e.g. using Zod) before database storage. If parsing fails, fall back to predefined placeholder templates to prevent server crashes.

### Smoke Testing Walkthrough
- Navigate to the production URL in an incognito window.
- Register a test researcher account and confirm receipt of the Magic Link email.
- Submit a test vulnerability report. Verify that the Multi-Provider client suggests a severity score within 30 seconds.
- Log in as the Organization. Accept the report and propose a payout bounty.
- Click **Approve**. Confirm that the database registers your profile as the human authorizer.

### Demo Presentation Script (Target: 6-7 Minutes)
1. **The Hook (0:00 - 0:30)**: Open on the landing page. Explain that VAULTX unifies bug bounty, VDP, pentesting, and automated audits, keeping humans in control of outcomes.
2. **Core Loop Demonstration (0:30 - 2:30)**: Arrange a Researcher window next to an Org window. Submit a vulnerability report. Show the live, no-refresh status changes and the AI severity suggestion panel.
3. **Security Governance Guardrails (2:30 - 3:30)**: Propose a $500 bounty. Demonstrate that database triggers block reward approvals unless explicitly signed off by a human.
4. **Diagnostic Audits (3:30 - 4:30)**: Open the Code Quality scanner. Demonstrate contract analysis highlights and vulnerability scores.
5. **Roadmap & Close (4:30 - 5:30)**: Present the Live PTaaS report dashboards and autonomous AI Red Team thinking logs. Conclude by highlighting the zero-infrastructure-cost serverless deployment.

### Accessibility Audit (WCAG 2.1 AA Compliance)
- **Keyboard Navigation**: Implemented `<SkipToContent />` as the first focusable element on all routes, linking straight to `#main-content` to skip sidebar menus.
- **Screen Reader Support**: Confirmed that all icon-only buttons (sidebar toggle, logout, alert bell) carry explicit `aria-label` attributes.
- **Contrast & Meaning**: Checked that muted dashboard text meets the 4.5:1 minimum contrast ratio. Ensured that triage severity indicators pair colored status badges with readable text labels so color is not the only signal used.
- **Motion Reduction**: Framer Motion animation configurations automatically respect `prefers-reduced-motion` settings.

### Performance & Bundle Audits
- **Lazy Loading Components**: Dynamic imports (`next/dynamic`) load the Command Palette modal code on-demand. This reduces the initial bundle size of all dashboard routes by ~20KB.
- **Font & Image Optimization**: Self-hosts typography packages via `next/font` to bypass render-blocking requests. Configured strict domain validation rules in `next.config.ts` to secure image rendering endpoints.

---

## 11. SETTINGS SYSTEM

The settings system provides comprehensive control for personal accounts and organizations. Detailed architectural documentation, database schemas, and server action definitions can be found in [settings_system_architecture.md](file:///C:/Users/hp/.gemini/antigravity-ide/brain/2e6daf62-254d-42d1-bd5b-60ed68d467f6/settings_system_architecture.md).

### Quick Summary of Features
- **Profile Customization**: Avatar crop uploads linked directly to the Supabase `avatars` Storage bucket.
- **Security Control**: Password strength enforcement and session revocation tables (OS, IP, agent tracking).
- **Organization Settings**: Invitation control workflows, membership management, default roles, and required domain signup rules.
- **API Key Engine**: Dynamic key prefixes and double-hashed API keys for external access.
- **Status & Integration Tiles**: Connectors for Slack notifications, Resend email deliveries, and GitHub integrations.
- **Lifecycle Protection**: A verify-first Danger Zone for account deletion or factory resets.


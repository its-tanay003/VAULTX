# VAULTX — Unified Security Intelligence Platform

An AI-first, zero-infrastructure-cost cybersecurity and code intelligence platform. VAULTX unifies bug bounty programs, Vulnerability Disclosure Programs (VDP), penetration testing (PTaaS), code quality scanning, Web3 smart contract auditing, autonomous AI Red Teaming, Capture The Flag (CTF) competitions, and Code4rena-Style Audit Contests into a single dashboard. 

Built with Next.js 14 App Router, Supabase (PostgreSQL with RLS), Cloudflare Pages, Upstash Redis, Resend, and a resilient Multi-Provider AI Fallback Engine (Claude Sonnet + Gemini Flash).

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
   - *Option B (Direct Panel)*: Paste migrations `001_initial.sql` through `011_audit_contests.sql` sequentially inside the Supabase SQL Editor.

#### 3. Setup Environment Variables
Create `.env.local` based on `.env.example`:
```bash
cp .env.example .env.local
```
Fill in the following:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-v1...
GEMINI_API_KEY=AIzaSy...
VAULT_INTERNAL_SECRET=your_32_byte_hex_secret
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@your-domain.com
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
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
│   │       ├── contests/      # Code4rena-Style Audit Contests Board (Week 14)
│   │       ├── ai-red-team/   # AI Autonomous Scanning Module (Week 11)
│   │       ├── code-quality/  # Static Code & Smart Contract Audit Console (Weeks 6/12)
│   │       ├── org/           # Org-Only Program & Submissions Triage (Weeks 2/5/6)
│   │       ├── ptaas/         # Pentesting Engagements & Report Gen (Week 10)
│   │       └── researcher/    # Researcher Dashboard, Submissions, Earnings (Week 3)
│   ├── auth/callback/         # Supabase Auth Callback Route
│   ├── onboarding/            # Profile Onboarding & Role Selection (Org vs Researcher)
│   └── page.tsx               # Animated Platform Landing Page (Week 8)
├── components/
│   ├── ctf/                   # Competition panels, Timers, Flag Submitters (Week 13)
│   ├── contests/              # Duplicate Panels, Status controls, Payout tables (Week 14)
│   ├── code-quality/          # Solidity Web3AuditButton (Week 12)
│   ├── layout/                # Sidebar, MobileSidebar, Header Elements
│   ├── ptaas/                 # EngagementStatusControl, Findings panels
│   ├── red-team/              # AggressionBadge, ReasoningTrace view components
│   └── ui/                    # StatCard, CopyButton, Modal Dialogs
├── lib/
│   ├── ai/                    # Multi-Provider (claude.ts), Smart Contract Audit (Week 12), Contest Judge/Distribution (Week 14)
│   ├── github/                # Repo file client with Solidity filters (Week 12)
│   └── supabase/              # Supabase Client, Server, and TS Types
├── supabase/
│   └── migrations/            # SQL Schemas (001_initial.sql to 011_audit_contests.sql)
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

### Module 5: Penetration Testing as a Service (PTaaS)
* **Engagements Coordinator**: Creates scheduled pentests with goals. Uses AI to draft structured test plan task lists.
* **Executive Summary Generator**: Aggregates logged findings into structured JSON report sections with remediation advice.

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

---

## 4. SYSTEM ARCHITECTURE

```mermaid
sequenceDiagram
    participant R as Researcher / User
    participant App as Next.js 14 Web App
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
   - Framework preset: `Next.js`
   - Build command: `npm run build`
   - Build output: `.next`
   - Environment Variable: Add `NODE_VERSION` set to `20`.
2. **Domain Mapping**: Attach your custom domain in the Pages panel. Universal SSL will auto-provision. Ensure `NEXT_PUBLIC_APP_URL` matches this domain exactly.
3. **Database Sanity Verification**: Run this query inside the Supabase SQL editor to ensure Row-Level Security is active on all public tables:
   ```sql
   select tablename, rowsecurity from pg_tables where schemaname = 'public';
   ```
   *Expected: Every row must return `rowsecurity = true`.*
4. **Active Uptime Checking**: Configure monitors on UptimeRobot for:
   - Dashboard index page: `https://your-domain.com`
   - AI API endpoint: `https://your-domain.com/api/ai/validate-submission`

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

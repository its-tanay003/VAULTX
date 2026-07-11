# VAULTX — Unified Security Intelligence Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/its-tanay003/VAULTX/actions)
[![Next.js Version](https://img.shields.io/badge/next.js-v16.2%20(Turbopack)-black.svg)](https://nextjs.org)
[![React Version](https://img.shields.io/badge/react-v19-blue.svg)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An AI-first, zero-infrastructure-cost cybersecurity and code intelligence platform. VAULTX unifies bug bounty programs, Vulnerability Disclosure Programs (VDP), penetration testing (PTaaS), code quality scanning, Web3 smart contract auditing, autonomous AI Red Teaming, Capture The Flag (CTF) competitions, and Code4rena-Style Audit Contests into a single, cohesive security operations dashboard.

---

## ✨ Features

- **Unified Security Triage**: Ingests open bug bounty and VDP submissions, runs automatic multi-engine deduplication, assesses severity, and displays findings.
- **Code Auditing (Web2 & Web3)**: Scans public/private GitHub repositories for OWASP Top 10 vulnerabilities, code quality smells, and Solidity gas/reentrancy patterns.
- **PTaaS Lifecycle Management**: Schedules time-boxed pentests, generates test plans, tracks finding states, and compiles executive summaries with content-integrity signed PDF exports.
- **Autonomous AI Red Teaming**: Simulates threat actors against a repository or scope description with reasoning logs and findings fed directly to the triage queue.
- **Capture The Flag (CTF)**: Jeopardy-style challenge boards with dynamic decay scores and hashed verification.
- **Audit Contests**: Code4rena-Style audit contests with pool payouts, auditor submission dashboards, and semantic duplicate pre-grouping.
- **AI Agent Mode (VAULT)**: floating assistant, consent-gated, context-aware streaming assistant able to execute scans, triage responses, and request details.

---

## 🚀 Quick Start & Installation

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/its-tanay003/VAULTX.git
cd vaultx
npm install
```

### 2. Configure Database (Supabase)

Apply migrations sequentially (`001_initial.sql` through `027_org_model_audit.sql`) inside the Supabase SQL Editor, or use the Supabase CLI to push migrations to your remote project.

### 3. Setup Environment Variables

Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

### 4. Configure Authentication

Inside Supabase Console → Authentication → Providers, enable **Email Magic link** and **Google OAuth** (redirect URI: `http://localhost:3000/auth/callback`).

### 5. Local Dev Execution

```bash
npm run dev
```

---

## ⚙️ Configuration & Environment Variables

| Variable | Description | Example / Pattern |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL of your Supabase project | `https://your-project-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous API key | `eyJ_anon_public_key_placeholder...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role private key | `eyJ_service_role_key_placeholder...` |
| `NEXT_PUBLIC_APP_URL` | Application root URL | `http://localhost:3000` or production domain |
| `ANTHROPIC_API_KEY` | Primary AI API key | `sk_test_xxxxxxxxxxxx` |
| `GEMINI_API_KEY` | Backup Fallback AI API key | `AIzaSy_xxxxxxxxxxxx` |
| `RESEND_API_KEY` | Email provider API key | `re_xxxxxxxxxxxx` |
| `UPSTASH_REDIS_REST_URL` | Redis URL for rate limiting & cache | `https://your-database-id.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Redis authentication token | `upstash_redis_token_placeholder...` |

---

## 🏗️ Architecture & Resources

VAULTX relies on a serverless-first, edge-optimized architecture deployed to **Cloudflare Pages**, using **Supabase** for database logic/RLS and a resilient multi-provider AI fallback wrapper (Claude Sonnet + Gemini Flash).

For detailed documents on the product requirements, implementation blueprint, database schemas, and architectural guidelines, refer to the following documents:

* **Architecture & Spec Blueprint**: See [docs/blueprint.md](file:///c:/New%20Volume%20(D)/vaultx/docs/blueprint.md)
* **Code of Conduct**: See [CODE_OF_CONDUCT.md](file:///c:/New%20Volume%20(D)/vaultx/CODE_OF_CONDUCT.md)
* **Contributing Guidelines**: See [CONTRIBUTING.md](file:///c:/New%20Volume%20(D)/vaultx/CONTRIBUTING.md)
* **Security Policy**: See [SECURITY.md](file:///c:/New%20Volume%20(D)/vaultx/SECURITY.md)
* **License**: See [LICENSE](file:///c:/New%20Volume%20(D)/vaultx/LICENSE) (MIT License)

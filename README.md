# VAULTX — Security Intelligence Platform

> AI-powered bug bounty, VDP, and code security platform.
> Built with Next.js 14, Supabase, Cloudflare Pages, and Claude AI.

---

## ⚡ Week 1 Setup (do this first)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/vaultx.git
cd vaultx
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Copy your **service role key** (keep secret)

### 3. Set environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

### 4. Run the database migration

Option A — Supabase CLI (recommended):
```bash
npx supabase login
npx supabase db push --db-url postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
```

Option B — Paste directly:
1. Open Supabase Dashboard → SQL Editor
2. Paste the contents of `supabase/migrations/001_initial.sql`
3. Click Run

### 5. Configure Supabase Auth

In Supabase Dashboard → Authentication → Providers:
- **Email** → Enable, enable "Magic link"
- **Google** → Enable, add Client ID + Secret from [Google Cloud Console](https://console.cloud.google.com)

In Authentication → URL Configuration:
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

### 6. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🚀 Deploy to Cloudflare Pages (free)

1. Push repo to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com) → Create project → Connect GitHub
3. Build settings:
   - Framework: `Next.js`
   - Build command: `npm run build`
   - Build output: `.next`
4. Add environment variables (same as `.env.local`)
5. Deploy → your app is live at `*.pages.dev`

For a custom domain: Pages → Custom domains → Add domain (free with Cloudflare DNS)

---

## 📁 Project Structure

```
vaultx/
├── app/
│   ├── (auth)/login/          # Login page (magic link + Google)
│   ├── (dashboard)/           # Protected dashboard routes
│   │   ├── layout.tsx         # Sidebar + header
│   │   └── dashboard/
│   │       ├── org/           # Organization dashboard
│   │       └── researcher/    # Researcher dashboard
│   ├── auth/callback/         # OAuth callback handler
│   ├── onboarding/            # Role selection + profile setup
│   └── page.tsx               # Landing page
├── components/
│   ├── layout/                # Sidebar, Header
│   └── ui/                    # StatCard, shared components
├── lib/
│   ├── supabase/              # client.ts, server.ts, types.ts
│   └── utils.ts               # cn(), formatters, sha256
├── supabase/
│   └── migrations/001_initial.sql
├── middleware.ts              # Auth protection + role routing
└── .env.example
```

---

## 🗓 Build Timeline

| Week | Dates       | Focus                       |
|------|-------------|----------------------------|
| W1   | Jun 13–19   | Foundation + Auth ← you are here |
| W2   | Jun 20–26   | Program Management          |
| W3   | Jun 27–Jul 3 | Researcher Submission       |
| W4   | Jul 4–10    | AI Validation Engine        |
| W5   | Jul 11–17   | Triager Workflow            |
| W6   | Jul 18–24   | Rewards + Code Quality      |
| W7   | Jul 25–31   | Polish Sprint 1             |
| W8   | Aug 1–7     | Polish Sprint 2 + Stubs     |
| W9   | Aug 8–15    | Buffer + Demo Prep          |

---

## 🔒 Platform Invariants (enforced at DB level)

1. **AI cannot approve rewards** — PostgreSQL trigger blocks `approved_by = null` on status change
2. **Audit log is immutable** — UPDATE/DELETE triggers raise exceptions on `audit_logs`
3. **User text is sanitized** — All user content passed to Claude API wrapped in `[DATA]...[/DATA]` blocks

---

## 🛠 Tech Stack

| Layer       | Tool                   | Cost    |
|-------------|------------------------|---------|
| Frontend    | Next.js 14 + TypeScript| Free    |
| Styling     | Tailwind + shadcn/ui   | Free    |
| Database    | Supabase (PostgreSQL)  | Free    |
| Auth        | Supabase Auth          | Free    |
| Hosting     | Cloudflare Pages       | Free    |
| CI/CD       | GitHub Actions         | Free    |
| Email       | Resend                 | Free    |
| Rate limit  | Upstash Redis          | Free    |
| AI          | Claude API (Anthropic) | Free trial |

---

## 🤖 Antigravity Prompt Queue

Next prompts to run in order:
1. **W2-01** — Program creation form + server action
2. **W2-02** — Program detail page + scope display
3. **W2-03** — Program list with filters + search
4. **W3-01** — Submission form with file upload
5. **W3-02** — Submission detail page + status timeline

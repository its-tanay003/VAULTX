import Link from "next/link";
import {
  ShieldCheck, Bug, Target, Trophy, Zap, Code2,
  ArrowRight, CheckCircle2, Star, Lock, Globe,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-vault-bg text-vault-text overflow-x-hidden">
      <div className="fixed inset-0 bg-grid pointer-events-none opacity-100" />
      <div className="fixed inset-x-0 top-0 h-[600px] bg-glow-teal pointer-events-none" />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-10 h-16 border-b border-vault-border/50 backdrop-blur-sm bg-vault-bg/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-vault-teal" />
          </div>
          <span className="font-semibold tracking-tight">VAULTX</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-vault-muted">
          <a href="#features"  className="hover:text-vault-text transition-colors">Features</a>
          <a href="#how"       className="hover:text-vault-text transition-colors">How it works</a>
          <a href="#pricing"   className="hover:text-vault-text transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-vault-muted hover:text-vault-text transition-colors hidden sm:block">
            Sign in
          </Link>
          <Link href="/login" className="btn-teal text-sm px-4 py-2 flex items-center gap-1.5">
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center pt-24 pb-20 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-vault-teal/30 bg-vault-teal/5 text-vault-teal text-xs font-medium mb-8 animate-in">
          <Zap className="w-3 h-3" />
          AI-powered vulnerability management platform
        </div>

        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6 max-w-3xl leading-tight animate-in animation-delay-100">
          Security research,{" "}
          <span className="text-teal-gradient">reimagined</span>
          {" "}for the AI era
        </h1>

        <p className="text-lg text-vault-muted max-w-xl leading-relaxed mb-10 animate-in animation-delay-200">
          Run world-class bug bounty and VDP programs. AI validates every submission,
          eliminates duplicates, and routes real vulnerabilities to your team in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 animate-in animation-delay-300">
          <Link
            href="/login"
            className="btn-teal px-6 py-3 text-sm flex items-center justify-center gap-2 shadow-vault-teal"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#how"
            className="btn-ghost px-6 py-3 text-sm flex items-center justify-center gap-2"
          >
            See how it works
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-6 mt-12 text-xs text-vault-muted animate-in animation-delay-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-vault-teal" />
            No credit card required
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-vault-teal" />
            Free forever plan
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-vault-teal" />
            Setup in 5 minutes
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="relative mt-16 w-full max-w-4xl animate-in animation-delay-500">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-vault-bg z-10 pointer-events-none" />
          <div className="vault-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-vault-border bg-vault-surface">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="flex-1 mx-4">
                <div className="h-5 bg-vault-elevated border border-vault-border rounded-md text-xs text-vault-muted flex items-center px-2">
                  app.vaultx.io/dashboard/org
                </div>
              </div>
            </div>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-12 border-y border-vault-border/50 bg-vault-surface/30">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "99.2%",  label: "Duplicate detection accuracy" },
            { value: "<2min",  label: "Average AI triage time" },
            { value: "3-stage",label: "Validation pipeline" },
            { value: "4",      label: "Personas supported" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-semibold text-teal-gradient mb-1">{value}</div>
              <div className="text-xs text-vault-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-vault-border text-xs text-vault-muted mb-4">
              Everything you need
            </div>
            <h2 className="text-3xl font-semibold tracking-tight mb-3">
              Built for serious security teams
            </h2>
            <p className="text-vault-muted text-sm max-w-md mx-auto">
              Every feature designed to reduce noise, reward real findings, and protect your organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, description, badge }) => (
              <div key={title} className="vault-card p-5 hover:border-vault-border-bright transition-colors group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center group-hover:bg-vault-teal/15 transition-colors">
                    <Icon className="w-4.5 h-4.5 text-vault-teal" />
                  </div>
                  {badge && (
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-vault-teal/10 text-vault-teal border border-vault-teal/20 rounded-full">
                      {badge}
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-sm mb-2">{title}</h3>
                <p className="text-xs text-vault-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="relative z-10 py-20 px-4 bg-vault-surface/20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold tracking-tight mb-3">How it works</h2>
            <p className="text-vault-muted text-sm">The complete vulnerability lifecycle in one platform</p>
          </div>
          <div className="space-y-4">
            {HOW_STEPS.map(({ step, title, description, icon: Icon }, i) => (
              <div key={step} className="flex gap-4 vault-card p-5">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center text-vault-teal text-sm font-semibold">
                    {step}
                  </div>
                  {i < HOW_STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-vault-border min-h-[16px]" />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-vault-teal" />
                    <h3 className="text-sm font-medium">{title}</h3>
                  </div>
                  <p className="text-xs text-vault-muted leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-2xl mx-auto text-center vault-card p-10 border-vault-teal/20">
          <div className="w-12 h-12 rounded-2xl bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-6 h-6 text-vault-teal" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Start securing your platform today</h2>
          <p className="text-vault-muted text-sm mb-7 max-w-sm mx-auto">
            Join researchers and organizations building a safer internet. Free forever, no credit card needed.
          </p>
          <Link href="/login" className="btn-teal px-8 py-3 text-sm inline-flex items-center gap-2">
            Create your workspace <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-vault-border py-8 px-6 text-center text-xs text-vault-muted">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-vault-teal" />
          <span className="font-medium text-vault-subtle">VAULTX</span>
        </div>
        <p>© 2025 VAULTX. Built for security researchers.</p>
      </footer>
    </div>
  );
}

/* ─── Data ────────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Zap,
    title: "AI Duplicate Detection",
    badge: "3-stage",
    description: "Hash match → fuzzy search → semantic AI comparison. Eliminates duplicate reports before they reach your team.",
  },
  {
    icon: Bug,
    title: "Bug Bounty & VDP",
    badge: null,
    description: "Run managed bug bounty programs or vulnerability disclosure programs with configurable scope, rules, and reward tiers.",
  },
  {
    icon: Target,
    title: "AI Severity Scoring",
    badge: "AI",
    description: "Every submission gets an AI-suggested severity with confidence score. Humans always make the final call.",
  },
  {
    icon: Trophy,
    title: "Reward Management",
    badge: null,
    description: "Track proposals, approvals, and payments. Enforced at the database level — AI can never approve a payout.",
  },
  {
    icon: Code2,
    title: "Code Quality Audit",
    badge: "Soon",
    description: "Static analysis, anti-pattern detection, and performance profiling integrated directly into your security workflow.",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    badge: null,
    description: "Row-level security on every table, immutable audit logs, and injection-proof AI prompt architecture.",
  },
];

const HOW_STEPS = [
  {
    step: "1",
    icon: Globe,
    title: "Organization creates a program",
    description: "Define scope, rules, reward tiers, and response SLAs. Launch publicly or invite specific researchers.",
  },
  {
    step: "2",
    icon: Bug,
    title: "Researcher submits a finding",
    description: "Structured report with title, description, steps to reproduce, impact, and proof-of-concept attachments.",
  },
  {
    step: "3",
    icon: Zap,
    title: "AI validates and deduplicates",
    description: "Three-stage pipeline checks for duplicates and suggests severity within seconds. No human time wasted on noise.",
  },
  {
    step: "4",
    icon: ShieldCheck,
    title: "Triager reviews and decides",
    description: "Accept, reject, request more info, or mark as duplicate. Full audit trail of every decision.",
  },
  {
    step: "5",
    icon: Trophy,
    title: "Reward approved and paid",
    description: "Human approves reward amount. Researcher reputation increases. The loop closes.",
  },
];

/* ─── Dashboard preview component ────────────────────────────────────────── */
function DashboardPreview() {
  return (
    <div className="flex h-64 overflow-hidden bg-vault-bg">
      {/* Sidebar preview */}
      <div className="w-40 border-r border-vault-border bg-vault-surface p-2 shrink-0">
        <div className="space-y-0.5">
          {["Overview", "Programs", "Submissions", "Triagers", "Rewards"].map((item, i) => (
            <div
              key={item}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                i === 0
                  ? "text-vault-teal bg-vault-teal/10 border border-vault-border"
                  : "text-vault-muted"
              }`}
            >
              <div className={`w-3 h-3 rounded-sm ${i === 0 ? "bg-vault-teal/40" : "bg-vault-border"}`} />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Main area preview */}
      <div className="flex-1 p-4 overflow-hidden">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "Active Programs", val: "3" },
            { label: "Submissions",     val: "47" },
            { label: "Acceptance Rate", val: "34%" },
            { label: "Total Paid",      val: "$8.2K" },
          ].map(({ label, val }) => (
            <div key={label} className="vault-card p-2">
              <div className="text-[9px] text-vault-muted mb-1">{label}</div>
              <div className="text-sm font-semibold text-vault-teal">{val}</div>
            </div>
          ))}
        </div>

        {/* Table preview */}
        <div className="vault-card overflow-hidden">
          <div className="px-3 py-2 border-b border-vault-border flex items-center justify-between">
            <div className="text-[10px] font-medium">Recent Submissions</div>
            <div className="text-[9px] text-vault-teal">View all →</div>
          </div>
          {[
            { title: "SQL injection in /api/users endpoint",  sev: "critical", status: "new"      },
            { title: "CSRF on account settings page",         sev: "high",     status: "triaging" },
            { title: "Rate limiting bypass on auth endpoint", sev: "medium",   status: "accepted" },
          ].map(({ title, sev, status }) => (
            <div key={title} className="px-3 py-1.5 border-b border-vault-border/50 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                sev === "critical" ? "bg-red-400" : sev === "high" ? "bg-orange-400" : "bg-yellow-400"
              }`} />
              <div className="text-[10px] text-vault-subtle flex-1 truncate">{title}</div>
              <div className={`text-[9px] px-1 rounded font-medium ${
                status === "accepted" ? "text-green-400" : status === "triaging" ? "text-violet-400" : "text-sky-400"
              }`}>{status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

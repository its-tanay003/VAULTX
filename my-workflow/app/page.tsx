import Link from "next/link";
import { ShieldCheck, ArrowRight, Globe, Bug, Zap, Trophy } from "lucide-react";
import { AnimatedHero }     from "@/components/landing/animated-hero";
import { FeatureShowcase }  from "@/components/landing/feature-showcase";
import { ScrollReveal }     from "@/components/landing/scroll-reveal";
import { AnimatedStatsBar } from "@/components/landing/animated-stats-bar";

/**
 * UPDATED Week 8: Full drop-in replacement for Week 1's landing page.
 * Hero and feature grid now use Framer Motion (see animated-hero.tsx,
 * feature-showcase.tsx). Stats bar counts up on scroll into view.
 * Dashboard preview and "How it works" timeline get scroll-reveal too.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-vault-bg text-vault-text overflow-x-hidden">
      <div className="fixed inset-0 bg-grid pointer-events-none opacity-100" />
      <div className="fixed inset-x-0 top-0 h-[600px] bg-glow-teal pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-10 h-16 border-b border-vault-border/50 backdrop-blur-sm bg-vault-bg/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-vault-teal" />
          </div>
          <span className="font-semibold tracking-tight">VAULTX</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-vault-muted">
          <a href="#features" className="hover:text-vault-text transition-colors">Features</a>
          <a href="#how"      className="hover:text-vault-text transition-colors">How it works</a>
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

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center pt-24 pb-20 px-4">
        <AnimatedHero />

        {/* Dashboard preview */}
        <ScrollReveal className="relative mt-16 w-full max-w-4xl" delay={0.1}>
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
        </ScrollReveal>
      </section>

      {/* Stats bar — counts up on scroll */}
      <section className="relative z-10 py-12 border-y border-vault-border/50 bg-vault-surface/30">
        <AnimatedStatsBar />
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-vault-border text-xs text-vault-muted mb-4">
              Everything you need
            </div>
            <h2 className="text-3xl font-semibold tracking-tight mb-3">
              Built for serious security teams
            </h2>
            <p className="text-vault-muted text-sm max-w-md mx-auto">
              Every feature designed to reduce noise, reward real findings, and protect your organization.
            </p>
          </ScrollReveal>

          <FeatureShowcase />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 py-20 px-4 bg-vault-surface/20">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-3xl font-semibold tracking-tight mb-3">How it works</h2>
            <p className="text-vault-muted text-sm">The complete vulnerability lifecycle in one platform</p>
          </ScrollReveal>

          <div className="space-y-4">
            {HOW_STEPS.map(({ step, title, description, icon: Icon }, i) => (
              <ScrollReveal key={step} delay={i * 0.08}>
                <div className="flex gap-4 vault-card p-5">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center text-vault-teal text-sm font-semibold">
                      {step}
                    </div>
                    {i < HOW_STEPS.length - 1 && <div className="w-px flex-1 bg-vault-border min-h-[16px]" />}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-vault-teal" />
                      <h3 className="text-sm font-medium">{title}</h3>
                    </div>
                    <p className="text-xs text-vault-muted leading-relaxed">{description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-4">
        <ScrollReveal className="max-w-2xl mx-auto text-center vault-card p-10 border-vault-teal/20">
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
        </ScrollReveal>
      </section>

      {/* Footer */}
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

const HOW_STEPS = [
  { step: "1", icon: Globe,       title: "Organization creates a program",  description: "Define scope, rules, reward tiers, and response SLAs. Launch publicly or invite specific researchers." },
  { step: "2", icon: Bug,         title: "Researcher submits a finding",    description: "Structured report with title, description, steps to reproduce, impact, and proof-of-concept attachments." },
  { step: "3", icon: Zap,         title: "AI validates and deduplicates",   description: "Three-stage pipeline checks for duplicates and suggests severity within seconds. No human time wasted on noise." },
  { step: "4", icon: ShieldCheck, title: "Triager reviews and decides",     description: "Accept, reject, request more info, or mark as duplicate. Full audit trail of every decision." },
  { step: "5", icon: Trophy,      title: "Reward approved and paid",        description: "Human approves reward amount. Researcher reputation increases. The loop closes." },
];

function DashboardPreview() {
  return (
    <div className="flex h-64 overflow-hidden bg-vault-bg">
      <div className="w-40 border-r border-vault-border bg-vault-surface p-2 shrink-0">
        <div className="space-y-0.5">
          {["Overview", "Programs", "Submissions", "Rewards", "Code Quality"].map((item, i) => (
            <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
              i === 0 ? "text-vault-teal bg-vault-teal/10 border border-vault-border" : "text-vault-muted"
            }`}>
              <div className={`w-3 h-3 rounded-sm ${i === 0 ? "bg-vault-teal/40" : "bg-vault-border"}`} />
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4 overflow-hidden">
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

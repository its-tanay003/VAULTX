"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap, CheckCircle2 } from "lucide-react";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Replaces the static Week 1 hero with a staggered entrance animation.
 * Each element (badge, headline, subhead, CTAs, social proof, preview)
 * fades + rises in sequence via Framer Motion variants — costs nothing
 * extra at runtime (CSS transforms only) but reads as significantly
 * more "alive" on first paint, which is the entire point of a landing
 * page's first 3 seconds.
 */
export function AnimatedHero() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center text-center"
    >
      <motion.div
        variants={item}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-vault-teal/30 bg-vault-teal/5 text-vault-teal text-xs font-medium mb-8"
      >
        <Zap className="w-3 h-3" />
        AI-powered vulnerability management platform
      </motion.div>

      <motion.h1
        variants={item}
        className="text-4xl md:text-6xl font-semibold tracking-tight mb-6 max-w-3xl leading-tight"
      >
        Security research,{" "}
        <span className="text-teal-gradient">reimagined</span>
        {" "}for the AI era
      </motion.h1>

      <motion.p
        variants={item}
        className="text-lg text-vault-muted max-w-xl leading-relaxed mb-10"
      >
        Run world-class bug bounty and VDP programs. AI validates every submission,
        eliminates duplicates, and routes real vulnerabilities to your team in seconds.
      </motion.p>

      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/login"
          className="btn-teal px-6 py-3 text-sm flex items-center justify-center gap-2 shadow-vault-teal group"
        >
          Start for free
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link href="#how" className="btn-ghost px-6 py-3 text-sm flex items-center justify-center gap-2">
          See how it works
        </Link>
      </motion.div>

      <motion.div
        variants={item}
        className="flex items-center gap-6 mt-12 text-xs text-vault-muted flex-wrap justify-center"
      >
        {["No credit card required", "Free forever plan", "Setup in 5 minutes"].map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-vault-teal" />
            {t}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

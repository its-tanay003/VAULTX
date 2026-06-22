"use client";

import { motion } from "framer-motion";
import {
  Zap, Bug, Target, Trophy, Code2, Lock,
} from "lucide-react";

const FEATURES = [
  {
    icon: Zap, title: "AI Duplicate Detection", badge: "3-stage",
    description: "Hash match → fuzzy search → semantic AI comparison. Eliminates duplicate reports before they reach your team.",
  },
  {
    icon: Bug, title: "Bug Bounty & VDP", badge: null,
    description: "Run managed bug bounty programs or vulnerability disclosure programs with configurable scope, rules, and reward tiers.",
  },
  {
    icon: Target, title: "AI Severity Scoring", badge: "AI",
    description: "Every submission gets an AI-suggested severity with confidence score. Humans always make the final call.",
  },
  {
    icon: Trophy, title: "Reward Management", badge: null,
    description: "Track proposals, approvals, and payments. Enforced at the database level — AI can never approve a payout.",
  },
  {
    icon: Code2, title: "Code Quality Audit", badge: "AI",
    description: "AI-powered static analysis for connected repositories. Security, performance, and quality findings in seconds.",
  },
  {
    icon: Lock, title: "Enterprise Security", badge: null,
    description: "Row-level security on every table, immutable audit logs, and injection-proof AI prompt architecture.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Replaces the static Week 1 feature grid with scroll-triggered reveal —
 * cards animate in via whileInView (fires once, margin pulls trigger
 * point above the fold so it doesn't feel delayed on fast scrollers).
 */
export function FeatureShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {FEATURES.map(({ icon: Icon, title, description, badge }, i) => (
        <motion.div
          key={title}
          variants={cardVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: i * 0.06 }}
          whileHover={{ y: -3 }}
          className="vault-card p-5 hover:border-vault-border-bright transition-colors group cursor-default"
        >
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
        </motion.div>
      ))}
    </div>
  );
}

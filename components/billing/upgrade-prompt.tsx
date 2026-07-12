"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

interface UpgradePromptProps {
  feature: string;
  message?: string;
}

const FEATURE_RECOMMENDATIONS: Record<string, { tier: string; desc: string }> = {
  active_programs: { tier: "Pro", desc: "Allows hosting up to 5 concurrent bug bounty programs." },
  ptaas: { tier: "Pro", desc: "Unlocks fully-managed PTaaS concurrent engagements." },
  ai_scan: { tier: "Pro", desc: "Increases monthly AI triage and code quality scans quota to 100." },
  red_team: { tier: "Pro", desc: "Enables up to 10 automated AI Red Team scans per month." },
  ctf: { tier: "Pro", desc: "Allows hosting live CTF events and contests." },
  seats: { tier: "Pro / Max", desc: "Adds support for additional team members and seats." },
};

export function UpgradePrompt({ feature, message }: UpgradePromptProps) {
  const recommendation = FEATURE_RECOMMENDATIONS[feature] || {
    tier: "Pro",
    desc: "Unlocks higher usage limits and premium platform features.",
  };

  return (
    <div className="vault-card border-vault-teal/20 bg-vault-teal/[0.02] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-lg bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-vault-teal" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-vault-text">Limit Reached</h4>
          <p className="text-xs text-vault-muted mt-0.5 leading-relaxed">
            {message || `You've reached the limit for this feature. Upgrading to the `}
            <span className="text-vault-teal font-medium">{recommendation.tier}</span> tier {recommendation.desc}
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/org/billing"
        className="btn-teal px-4 py-2 text-xs shrink-0 self-start sm:self-center flex items-center gap-1.5"
      >
        Upgrade Plan <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

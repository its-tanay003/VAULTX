"use client";

import { useState, Fragment } from "react";
import { ChevronDown, ChevronUp, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureRow {
  name: string;
  free: string | boolean;
  pro: string | boolean;
  max: string | boolean;
  proMax: string | boolean;
}

interface FeatureSection {
  category: string;
  features: FeatureRow[];
}

const COMPARISON_DATA: FeatureSection[] = [
  {
    category: "Security Programs",
    features: [
      { name: "Active Security Programs", free: "1 Program", pro: "5 Programs", max: "20 Programs", proMax: "Unlimited" },
      { name: "Public Program Listing", free: true, pro: true, max: true, proMax: true },
      { name: "Private/VDP Scope Support", free: false, pro: true, max: true, proMax: true },
    ],
  },
  {
    category: "AI Triaging & Automated Security",
    features: [
      { name: "AI Triage Requests / month", free: "5 scans", pro: "100 scans", max: "500 scans", proMax: "Unlimited" },
      { name: "VAULT Assistant Chat & Context", free: "Basic", pro: "Advanced", max: "Custom Agents", proMax: "Dedicated Model" },
      { name: "AI Code Quality Scans (Solidity + Web)", free: false, pro: "Basic Scans", max: "Deep Scans", proMax: "Continuous CI/CD" },
      { name: "AI Red Team Target Runs / month", free: "1 run", pro: "10 runs", max: "50 runs", proMax: "Unlimited" },
    ],
  },
  {
    category: "PTaaS & Contests",
    features: [
      { name: "PTaaS Concurrent Engagements", free: "0", pro: "1 active", max: "5 active", proMax: "Unlimited" },
      { name: "Live CTF / Hackathons", free: "0", pro: "1 active", max: "5 active", proMax: "Unlimited" },
      { name: "Audit Contest Submissions / month", free: "0", pro: "5 submissions", max: "20 submissions", proMax: "Unlimited" },
    ],
  },
  {
    category: "Workspace & Team",
    features: [
      { name: "Seats / Team members", free: "1 Seat", pro: "5 Seats", max: "20 Seats", proMax: "Unlimited" },
      { name: "SAML SSO Authentication", free: false, pro: false, max: true, proMax: true },
      { name: "Enterprise SLA & Dedicated Support", free: false, pro: false, max: false, proMax: true },
    ],
  },
];

interface FeatureComparisonProps {
  currentTier?: string;
}

export function FeatureComparison({ currentTier = "free" }: FeatureComparisonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedTier = currentTier.toLowerCase().replace(/\s+/g, "_");

  const renderValue = (val: string | boolean) => {
    if (typeof val === "boolean") {
      return val ? (
        <Check className="w-4 h-4 text-vault-teal mx-auto" />
      ) : (
        <Minus className="w-4 h-4 text-vault-muted mx-auto" />
      );
    }
    return <span className="text-xs text-vault-subtle">{val}</span>;
  };

  return (
    <div className="vault-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-vault-surface/40 transition-colors"
      >
        <span className="text-sm font-medium">Full Feature & Quota Comparison</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-vault-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-vault-muted" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-vault-border/50 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px] block">
            <thead>
              <tr className="border-b border-vault-border bg-vault-surface/40">
                <th className="p-4 text-xs font-semibold text-vault-muted">Feature</th>
                <th
                  className={cn(
                    "p-4 text-xs font-semibold text-center w-32 transition-colors",
                    normalizedTier === "free" && "bg-vault-teal/5 text-vault-teal"
                  )}
                >
                  Free
                </th>
                <th
                  className={cn(
                    "p-4 text-xs font-semibold text-center w-32 transition-colors",
                    normalizedTier === "pro" && "bg-vault-teal/5 text-vault-teal"
                  )}
                >
                  Pro
                </th>
                <th
                  className={cn(
                    "p-4 text-xs font-semibold text-center w-32 transition-colors",
                    normalizedTier === "max" && "bg-vault-teal/5 text-vault-teal"
                  )}
                >
                  Max
                </th>
                <th
                  className={cn(
                    "p-4 text-xs font-semibold text-center w-32 transition-colors",
                    (normalizedTier === "pro_max" || normalizedTier === "promax") &&
                      "bg-vault-teal/5 text-vault-teal"
                  )}
                >
                  Pro Max
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vault-border/40">
              {COMPARISON_DATA.map((section) => (
                <Fragment key={section.category}>
                  <tr className="bg-vault-bg/50">
                    <td
                      colSpan={5}
                      className="p-3 text-[10px] uppercase tracking-wider font-semibold text-vault-muted"
                    >
                      {section.category}
                    </td>
                  </tr>
                  {section.features.map((row) => (
                    <tr key={row.name} className="hover:bg-vault-surface/20 transition-colors">
                      <td className="p-4 text-xs font-medium text-vault-text">{row.name}</td>
                      <td
                        className={cn(
                          "p-4 text-center text-xs transition-colors",
                          normalizedTier === "free" && "bg-vault-teal/[0.02]"
                        )}
                      >
                        {renderValue(row.free)}
                      </td>
                      <td
                        className={cn(
                          "p-4 text-center text-xs transition-colors",
                          normalizedTier === "pro" && "bg-vault-teal/[0.02]"
                        )}
                      >
                        {renderValue(row.pro)}
                      </td>
                      <td
                        className={cn(
                          "p-4 text-center text-xs transition-colors",
                          normalizedTier === "max" && "bg-vault-teal/[0.02]"
                        )}
                      >
                        {renderValue(row.max)}
                      </td>
                      <td
                        className={cn(
                          "p-4 text-center text-xs transition-colors",
                          (normalizedTier === "pro_max" || normalizedTier === "promax") &&
                            "bg-vault-teal/[0.02]"
                        )}
                      >
                        {renderValue(row.proMax)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

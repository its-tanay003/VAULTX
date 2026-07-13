"use client";

import { useState } from "react";
import { AlertTriangle, Shield, Eye, List, ShieldAlert } from "lucide-react";
import { CodeReviewWorkspace } from "@/components/code-review/workspace";
import type { CodeFinding } from "@/lib/ai/code-review";
import type { SmartContractFinding } from "@/lib/ai/smart-contract-audit";

interface ScanResultPanelProps {
  scan: any;
  circumference: number;
  isWeb3: boolean;
  repoId: string;
}

const SEV_CFG: Record<string, { cls: string }> = {
  critical: { cls: "text-red-400 bg-red-950/50 border-red-900/50"          },
  high:     { cls: "text-orange-400 bg-orange-950/50 border-orange-900/50" },
  medium:   { cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
  low:      { cls: "text-blue-400 bg-blue-950/50 border-blue-900/50"       },
  info:     { cls: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"       },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  security:          <Shield   className="w-3.5 h-3.5 text-red-400"    />,
  performance:       <ShieldAlert      className="w-3.5 h-3.5 text-yellow-400" />,
  quality:           <Shield   className="w-3.5 h-3.5 text-blue-400"   />,
  "anti-pattern":    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

export function ScanResultPanel({ scan, circumference, isWeb3, repoId }: ScanResultPanelProps) {
  const [viewMode, setViewMode] = useState<"workspace" | "flat">("workspace");

  if (scan.status === "running") {
    return (
      <div className="vault-card p-8 text-center animate-pulse">
        <div className="w-10 h-10 border-2 border-vault-teal/30 border-t-vault-teal rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium">
          {isWeb3 ? "AI auditing smart contracts…" : "AI analyzing the repository…"}
        </p>
        <p className="text-xs text-vault-muted mt-1">
          {isWeb3 ? "Checking for reentrancy, access control, oracle issues, and more" : "Usually takes 10–20 seconds"}
        </p>
      </div>
    );
  }

  if (scan.status === "failed") {
    return (
      <div className="vault-card p-5 border-red-900/50">
        <div className="flex gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400 mb-1">
              {isWeb3 ? "Web3 audit failed" : "Scan failed"}
            </p>
            <p className="text-xs text-vault-muted">{scan.error ?? "Unknown error occurred"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (scan.status !== "complete") return null;

  const score  = scan.score as number;
  const scoreOffset = circumference - ((score ?? 0) / 100) * circumference;

  const findings = (scan.findings as any[]) ?? [];
  const severityOrder = ["critical", "high", "medium", "low", "info"];
  const sorted = [...findings].sort((a: any, b: any) => {
    return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
  });

  return (
    <div className="space-y-5 animate-in">
      {/* Score card */}
      <div className="vault-card p-6">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#27272a" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="36" fill="none"
                className={scoreColor(score).replace("text-", "stroke-")}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={scoreOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
              <span className="text-[10px] text-vault-muted">/ 100</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium">
                  {isWeb3 ? "Smart Contract Security Audit" : "Code Quality Analysis"}
                </h2>
                {isWeb3 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-vault-teal/10 text-vault-teal border border-vault-teal/20 rounded">
                    Web3
                  </span>
                )}
              </div>
              
              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-vault-elevated border border-vault-border rounded-lg p-0.5 shrink-0">
                <button
                  onClick={() => setViewMode("workspace")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    viewMode === "workspace"
                      ? "bg-vault-surface text-vault-text border border-vault-border"
                      : "text-vault-muted hover:text-vault-text"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Code Workspace
                </button>
                <button
                  onClick={() => setViewMode("flat")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    viewMode === "flat"
                      ? "bg-vault-surface text-vault-text border border-vault-border"
                      : "text-vault-muted hover:text-vault-text"
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> Findings List
                </button>
              </div>
            </div>
            <p className="text-sm text-vault-muted leading-relaxed">{scan.summary}</p>
            <p className="text-xs text-vault-muted mt-3">
              {scan.files_scanned} file{scan.files_scanned !== 1 ? "s" : ""} scanned ·{" "}
              {findings.length} finding{findings.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Conditional Panels */}
      {viewMode === "workspace" ? (
        <CodeReviewWorkspace repoId={repoId} scanId={scan.id} findings={findings} />
      ) : sorted.length === 0 ? (
        <div className="vault-card p-8 text-center">
          <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-3 opacity-80" />
          <p className="text-sm font-medium">No issues found</p>
          <p className="text-xs text-vault-muted mt-1">
            {isWeb3 ? "The audited contracts appear clean" : "The scanned files look healthy"}
          </p>
        </div>
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          <div className="p-4 border-b border-vault-border">
            <h2 className="text-sm font-medium">Findings ({sorted.length})</h2>
          </div>
          {sorted.map((raw, i) => {
            if (isWeb3) {
              const f = raw as SmartContractFinding;
              const sevCfg = SEV_CFG[f.severity] ?? SEV_CFG.info;
              return (
                <div key={i} className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${sevCfg.cls}`}>
                      {f.severity}
                    </span>
                    {f.swcId && (
                      <span className="text-[10px] text-vault-muted border border-vault-border rounded px-1.5 py-0.5">
                        {f.swcId}
                      </span>
                    )}
                    <span className="text-[10px] text-vault-muted">{f.category}</span>
                  </div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-vault-muted leading-relaxed">{f.description}</p>
                  {f.codeSnippet && (
                    <pre className="text-xs font-mono bg-vault-bg border border-vault-border rounded p-2.5 overflow-x-auto text-vault-subtle">
                      {f.codeSnippet}
                    </pre>
                  )}
                  <div className="text-xs text-vault-muted font-mono">
                    {f.file}{f.line ? `:${f.line}` : ""}
                  </div>
                  <div className="flex items-start gap-2 bg-vault-teal/5 border border-vault-teal/15 rounded p-2.5">
                    <Shield className="w-3.5 h-3.5 text-vault-teal shrink-0 mt-0.5" />
                    <p className="text-xs text-vault-muted leading-relaxed">{f.recommendation}</p>
                  </div>
                </div>
              );
            } else {
              const f = raw as CodeFinding;
              const sevCfg = SEV_CFG[f.severity] ?? SEV_CFG.info;
              return (
                <div key={i} className="p-4 flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${sevCfg.cls}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${sevCfg.cls}`}>
                        {f.severity}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-vault-muted">
                        {CATEGORY_ICONS[f.category] ?? null} {f.category}
                      </span>
                      {f.source && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                          f.source === "static"
                            ? "text-teal-400 bg-teal-950/30 border-teal-900/40"
                            : "text-violet-400 bg-violet-950/30 border-violet-900/40"
                        }`}>
                          {f.source === "static" ? "Static" : "AI"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-vault-text leading-relaxed">{f.message}</p>
                    <p className="text-xs text-vault-muted font-mono mt-1.5">
                      {f.file}{f.line ? `:${f.line}` : ""}
                    </p>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

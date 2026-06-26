"use client";

import { useState, useTransition } from "react";
import { judgeFinding }   from "@/app/actions/contests";
import { toast }          from "sonner";
import {
  CheckCircle2, XCircle, Copy, ChevronDown,
  ChevronUp, Loader2, User, FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FindingData {
  id:               string;
  contestId:        string;
  title:            string;
  description:      string;
  stepsToReproduce: string | null;
  impact:           string | null;
  suggestedFix:     string | null;
  affectedFiles:    string[] | null;
  severity:         string;
  status:           string;
  auditorName:      string;
}

interface Props {
  finding:         FindingData;
  allFindingIds:   { id: string; title: string }[];
  sevConfig:       { cls: string; label: string };
}

export function JudgePanel({ finding, allFindingIds, sevConfig }: Props) {
  const [expanded,      setExpanded]      = useState(true);
  const [confirmedSev,  setConfirmedSev]  = useState(finding.severity);
  const [duplicateOf,   setDuplicateOf]   = useState("");
  const [judgeNote,     setJudgeNote]     = useState("");
  const [pending,       start]            = useTransition();

  function judge(
    status: "valid" | "invalid" | "duplicate",
    outcome: "unique" | "duplicate_of" | null
  ) {
    if (status === "duplicate" && !duplicateOf) {
      toast.error("Select the original finding this duplicates");
      return;
    }
    start(async () => {
      try {
        await judgeFinding(finding.id, finding.contestId, {
          status,
          judging_outcome:    outcome,
          duplicate_of:       status === "duplicate" ? duplicateOf : null,
          confirmed_severity: confirmedSev !== finding.severity ? confirmedSev : null,
          judge_note:         judgeNote || null,
        });
        toast.success(`Finding marked ${status}`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to judge finding");
      }
    });
  }

  const otherFindings = allFindingIds.filter((f) => f.id !== finding.id);

  return (
    <div className="vault-card overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-vault-elevated/50 transition-colors"
      >
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 mt-0.5", sevConfig.cls)}>
          {sevConfig.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{finding.title}</p>
          <p className="text-xs text-vault-muted flex items-center gap-1.5 mt-0.5">
            <User className="w-3 h-3" /> {finding.auditorName}
          </p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-vault-muted shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-vault-muted shrink-0 mt-0.5" />}
      </button>

      {expanded && (
        <div className="border-t border-vault-border p-4 space-y-4">
          {/* Finding details */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-medium text-vault-teal uppercase tracking-wide mb-1">Description</p>
              <p className="text-xs text-vault-muted leading-relaxed">{finding.description}</p>
            </div>
            {finding.stepsToReproduce && (
              <div>
                <p className="text-[10px] font-medium text-vault-teal uppercase tracking-wide mb-1">Steps to reproduce</p>
                <pre className="text-xs text-vault-subtle font-mono bg-vault-bg border border-vault-border rounded p-2.5 overflow-x-auto whitespace-pre-wrap">
                  {finding.stepsToReproduce}
                </pre>
              </div>
            )}
            {finding.impact && (
              <div>
                <p className="text-[10px] font-medium text-vault-teal uppercase tracking-wide mb-1">Impact</p>
                <p className="text-xs text-vault-muted leading-relaxed">{finding.impact}</p>
              </div>
            )}
            {finding.suggestedFix && (
              <div>
                <p className="text-[10px] font-medium text-vault-teal uppercase tracking-wide mb-1">Suggested fix</p>
                <p className="text-xs text-vault-muted leading-relaxed">{finding.suggestedFix}</p>
              </div>
            )}
            {finding.affectedFiles && finding.affectedFiles.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <FileCode className="w-3.5 h-3.5 text-vault-muted" />
                {finding.affectedFiles.map((f) => (
                  <span key={f} className="text-[10px] font-mono text-vault-muted border border-vault-border rounded px-1.5 py-0.5">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Judging controls */}
          <div className="border-t border-vault-border pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5">Confirm severity</label>
                <select
                  value={confirmedSev}
                  onChange={(e) => setConfirmedSev(e.target.value)}
                  className="vault-input text-xs py-1.5"
                >
                  {["critical","high","medium","low","info"].map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Duplicate of (if applicable)</label>
                <select
                  value={duplicateOf}
                  onChange={(e) => setDuplicateOf(e.target.value)}
                  className="vault-input text-xs py-1.5"
                >
                  <option value="">Not a duplicate</option>
                  {otherFindings.map((f) => (
                    <option key={f.id} value={f.id}>{f.title.slice(0, 50)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Judge note (optional)</label>
              <textarea
                value={judgeNote}
                onChange={(e) => setJudgeNote(e.target.value)}
                rows={2}
                placeholder="Internal note for the auditor about this judgment…"
                className="vault-input resize-none text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => judge("invalid", null)}
                disabled={pending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-red-400 border-red-900/50 bg-red-950/30 hover:bg-red-950/50 transition-colors disabled:opacity-40"
              >
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Invalid
              </button>
              {duplicateOf ? (
                <button
                  onClick={() => judge("duplicate", "duplicate_of")}
                  disabled={pending}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-zinc-400 border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors disabled:opacity-40"
                >
                  {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  Mark Duplicate
                </button>
              ) : (
                <button
                  onClick={() => judge("valid", "unique")}
                  disabled={pending}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-emerald-400 border-emerald-900/50 bg-emerald-950/30 hover:bg-emerald-950/50 transition-colors disabled:opacity-40"
                >
                  {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Valid — Unique
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

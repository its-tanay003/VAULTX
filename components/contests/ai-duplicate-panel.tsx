"use client";

import { useState, useTransition } from "react";
import { getAIDuplicateSuggestions } from "@/app/actions/contests";
import { toast }    from "sonner";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Props { contestId: string }

export function AIDuplicatePanel({ contestId }: Props) {
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof getAIDuplicateSuggestions>> | null>(null);
  const [expanded,    setExpanded]    = useState(false);
  const [pending,     start]          = useTransition();

  function load() {
    start(async () => {
      try {
        const result = await getAIDuplicateSuggestions(contestId);
        setSuggestions(result);
        setExpanded(true);
        if (result.length === 0) toast.info("AI found no obvious duplicate groups");
        else toast.success(`AI identified ${result.length} possible duplicate group${result.length !== 1 ? "s" : ""}`);
      } catch {
        toast.error("AI duplicate detection unavailable");
      }
    });
  }

  return (
    <div className="vault-card p-4 border-vault-teal/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-vault-teal" /> AI Duplicate Detection
          </p>
          <p className="text-xs text-vault-muted mt-0.5">
            Let AI pre-group semantically similar findings to speed up your review
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {suggestions && suggestions.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-vault-muted hover:text-vault-text transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={load}
            disabled={pending}
            className="btn-ghost text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {pending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</>
              : suggestions !== null ? "Re-run" : "Detect Duplicates"}
          </button>
        </div>
      </div>

      {expanded && suggestions && suggestions.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-vault-border pt-4">
          {suggestions.map((group, i) => (
            <div key={i} className="bg-vault-elevated border border-vault-border rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">Group {i + 1}</p>
                <span className="text-[10px] text-vault-teal">
                  {Math.round(group.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-[11px] text-vault-muted">{group.reasoning}</p>
              <div className="space-y-1">
                <p className="text-[10px] text-vault-muted font-medium">Root: <span className="font-mono">{group.rootFindingId.slice(0, 8)}…</span></p>
                <p className="text-[10px] text-vault-muted">
                  Duplicates: {group.duplicateIds.map((id) => id.slice(0, 8) + "…").join(", ")}
                </p>
              </div>
              <p className="text-[10px] text-vault-muted italic">
                Use the &quot;Duplicate of&quot; selector in each finding card to apply these suggestions — AI groups are suggestions only.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

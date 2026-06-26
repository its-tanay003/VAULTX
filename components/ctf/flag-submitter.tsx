"use client";

import { useState, useTransition } from "react";
import { revealHint }  from "@/app/actions/ctf";
import { toast }       from "sonner";
import {
  CheckCircle2, Flag, ExternalLink,
  Eye, Loader2, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeData {
  id:             string;
  competitionId:  string;
  title:          string;
  description:    string;
  category:       string;
  difficulty:     string;
  basePoints:     number;
  minPoints:      number;
  solveCount:     number;
  hint:           string | null;
  hintCost:       number;
  hasHint:        boolean;
  attachmentUrl:  string | null;
}

interface Props {
  challenge:            ChallengeData;
  solved:               boolean;
  solvePoints:          number | null;
  solvePosition:        number | null;
  hintAlreadyRevealed:  boolean;
  isActive:             boolean;
  diffConfig:           { label: string; cls: string };
}

export function FlagSubmitter({
  challenge, solved, solvePoints, solvePosition,
  hintAlreadyRevealed, isActive, diffConfig,
}: Props) {
  const [flag,     setFlag]     = useState("");
  const [expanded, setExpanded] = useState(false);
  const [hintShown,setHintShown]= useState(hintAlreadyRevealed);
  const [hintText, setHintText] = useState(challenge.hint);
  const [result,   setResult]   = useState<"correct" | "wrong" | null>(null);
  const [submitting, start]     = useTransition();
  const [hinting, startHint]    = useTransition();

  async function handleSubmit() {
    if (!flag.trim()) return;
    start(async () => {
      try {
        const res = await fetch("/api/ctf/submit-flag", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ challenge_id: challenge.id, flag: flag.trim() }),
        });
        const data = await res.json();

        if (data.correct) {
          setResult("correct");
          toast.success(data.message, { duration: 5000 });
        } else if (res.status === 429) {
          toast.error(data.error);
        } else {
          setResult("wrong");
          setFlag("");
          setTimeout(() => setResult(null), 2000);
          toast.error(data.error ?? "Incorrect flag — keep trying!");
        }
      } catch {
        toast.error("Submission failed — check your connection");
      }
    });
  }

  function handleRevealHint() {
    startHint(async () => {
      try {
        await revealHint(challenge.id, challenge.competitionId, challenge.hintCost);
        setHintShown(true);
        setHintText(challenge.hint ?? ""); // will reload from server on next render
        toast.info(`Hint revealed (-${challenge.hintCost} pts)`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to reveal hint");
      }
    });
  }

  return (
    <div className={cn(
      "vault-card overflow-hidden transition-all",
      solved ? "border-emerald-900/50" : "border-vault-border",
      result === "wrong" && "border-red-900/50",
    )}>
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-vault-elevated/50 transition-colors"
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          solved ? "bg-emerald-950/50 border border-emerald-900/50" : "bg-vault-elevated border border-vault-border"
        )}>
          {solved
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            : <Flag className="w-4 h-4 text-vault-teal" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{challenge.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", diffConfig.cls)}>
              {diffConfig.label}
            </span>
            <span className="text-[10px] text-vault-muted">
              {solved
                ? `Solved · ${solvePoints} pts${solvePosition === 1 ? " 🩸" : ""}`
                : `${challenge.solveCount} solve${challenge.solveCount !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-vault-teal">{challenge.basePoints}</p>
          <p className="text-[10px] text-vault-muted">pts</p>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-vault-border p-4 space-y-3">
          <p className="text-xs text-vault-muted leading-relaxed whitespace-pre-wrap">
            {challenge.description}
          </p>

          {challenge.attachmentUrl && (
            <a
              href={challenge.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-vault-teal hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Download challenge files
            </a>
          )}

          {/* Hint */}
          {challenge.hasHint && (
            <div className={cn(
              "rounded-lg border p-3",
              hintShown
                ? "bg-vault-teal/5 border-vault-teal/20"
                : "bg-vault-elevated border-vault-border"
            )}>
              {hintShown ? (
                <>
                  <p className="text-[10px] font-medium text-vault-teal mb-1">Hint</p>
                  <p className="text-xs text-vault-muted">{hintText ?? "Reload to see hint"}</p>
                </>
              ) : (
                <button
                  onClick={handleRevealHint}
                  disabled={hinting || solved || !isActive}
                  className="flex items-center gap-1.5 text-xs text-vault-muted hover:text-vault-teal transition-colors disabled:opacity-50"
                >
                  {hinting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Eye className="w-3.5 h-3.5" />}
                  Reveal hint (-{challenge.hintCost} pts)
                </button>
              )}
            </div>
          )}

          {/* Flag submission */}
          {!solved && isActive ? (
            <div className="flex gap-2">
              <input
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="FLAG{...}"
                className={cn(
                  "vault-input font-mono text-xs flex-1",
                  result === "wrong" && "border-red-900/50 bg-red-950/10"
                )}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !flag.trim()}
                className="btn-teal text-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit"}
              </button>
            </div>
          ) : solved ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Solved! {solvePosition === 1 ? "🩸 First blood!" : `Position #${solvePosition}`}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-vault-muted">
              <Lock className="w-3.5 h-3.5" /> Competition not active
            </div>
          )}
        </div>
      )}
    </div>
  );
}

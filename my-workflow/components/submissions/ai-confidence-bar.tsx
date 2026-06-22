"use client";

import { cn } from "@/lib/utils";

interface Props {
  confidence: number;  // 0–1
  label?:     string;
}

export function AIConfidenceBar({ confidence, label = "Confidence" }: Props) {
  const pct = Math.round(confidence * 100);

  const color =
    pct >= 80 ? "bg-emerald-400" :
    pct >= 60 ? "bg-teal-400"    :
    pct >= 40 ? "bg-yellow-400"  :
               "bg-zinc-500";

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-vault-muted">{label}</span>
        <span className={cn(
          "text-xs font-semibold",
          pct >= 80 ? "text-emerald-400" :
          pct >= 60 ? "text-teal-400"    :
          pct >= 40 ? "text-yellow-400"  :
                      "text-zinc-400"
        )}>
          {pct}%
        </span>
      </div>
      <div className="bg-vault-elevated rounded-full h-1.5 overflow-hidden">
        <div
          className={cn("h-1.5 rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-vault-muted mt-1">
        {pct >= 80 ? "High confidence"
        : pct >= 60 ? "Moderate confidence — verify manually"
        : pct >= 40 ? "Low confidence — manual review recommended"
        : "Very low — AI uncertain, rely on human judgment"}
      </p>
    </div>
  );
}

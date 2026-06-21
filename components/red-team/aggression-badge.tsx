import { cn } from "@/lib/utils";

const CONFIG = {
  passive:    { label: "Passive",    cls: "text-blue-400 bg-blue-950/50 border-blue-900/50"      },
  standard:   { label: "Standard",   cls: "text-teal-400 bg-teal-950/50 border-teal-900/50"       },
  aggressive: { label: "Aggressive", cls: "text-orange-400 bg-orange-950/50 border-orange-900/50" },
} as const;

export function AggressionBadge({ level }: { level: string }) {
  const cfg = CONFIG[level as keyof typeof CONFIG] ?? CONFIG.standard;
  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

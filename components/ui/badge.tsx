import { cn } from "@/lib/utils";
import {
  SEVERITY_CONFIG, SUBMISSION_STATUS_CONFIG, CONTEST_STATUS_CONFIG,
  ENGAGEMENT_STATUS_CONFIG, CTF_DIFF_CONFIG, REWARD_STATUS_CONFIG,
  type SeverityKey,
} from "@/lib/design-system";

type BadgeSize = "sm" | "md";
interface BadgeProps {
  type: "severity"|"submission_status"|"contest_status"|"engagement_status"|"ctf_diff"|"reward_status"|"custom";
  value?: string;
  label?: string;
  cls?:   string;
  size?:  BadgeSize;
  dot?:   boolean;
  className?: string;
}

const SIZE_CLS: Record<BadgeSize, string> = {
  sm: "text-[10px] font-medium px-1.5 py-0.5 rounded border",
  md: "text-xs font-medium px-2 py-0.5 rounded-full border",
};

export function Badge({ type, value = "", label, cls, size = "sm", dot = false, className }: BadgeProps) {
  let resolvedCls = cls ?? "";
  let resolvedLabel = label ?? value;

  switch (type) {
    case "severity": {
      const c = SEVERITY_CONFIG[value as SeverityKey] ?? SEVERITY_CONFIG.info;
      resolvedCls = c.badge; resolvedLabel = label ?? c.label; break;
    }
    case "submission_status": {
      const c = SUBMISSION_STATUS_CONFIG[value as keyof typeof SUBMISSION_STATUS_CONFIG];
      if (c) { resolvedCls = c.badge; resolvedLabel = label ?? c.label; } break;
    }
    case "contest_status": {
      const c = CONTEST_STATUS_CONFIG[value as keyof typeof CONTEST_STATUS_CONFIG];
      if (c) { resolvedCls = c.badge; resolvedLabel = label ?? c.label; } break;
    }
    case "engagement_status": {
      const c = ENGAGEMENT_STATUS_CONFIG[value as keyof typeof ENGAGEMENT_STATUS_CONFIG];
      if (c) { resolvedCls = c.badge; resolvedLabel = label ?? c.label; } break;
    }
    case "ctf_diff": {
      const c = CTF_DIFF_CONFIG[value as keyof typeof CTF_DIFF_CONFIG];
      if (c) { resolvedCls = c.badge; resolvedLabel = label ?? c.label; } break;
    }
    case "reward_status": {
      const c = REWARD_STATUS_CONFIG[value as keyof typeof REWARD_STATUS_CONFIG];
      if (c) { resolvedCls = c.badge; resolvedLabel = label ?? c.label; } break;
    }
  }

  let dotCls = "";
  if (dot && type === "severity") dotCls = SEVERITY_CONFIG[value as SeverityKey]?.dot ?? "bg-zinc-500";
  if (dot && type === "submission_status") dotCls = SUBMISSION_STATUS_CONFIG[value as keyof typeof SUBMISSION_STATUS_CONFIG]?.dot ?? "bg-zinc-500";

  return (
    <span className={cn(SIZE_CLS[size], resolvedCls, "inline-flex items-center gap-1.5", className)}>
      {dot && dotCls && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotCls)} />}
      {resolvedLabel}
    </span>
  );
}

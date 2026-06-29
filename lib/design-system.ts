/**
 * VAULTX Design System Constants — single source of truth
 * for every color token, status config, and spacing value.
 * Import from here instead of hardcoding inline.
 */

export const SEVERITY_CONFIG = {
  critical: { label: "Critical", dot: "bg-red-400",    badge: "text-red-400 bg-red-950/50 border-red-900/50",         weight: 10 },
  high:     { label: "High",     dot: "bg-orange-400", badge: "text-orange-400 bg-orange-950/50 border-orange-900/50", weight: 5  },
  medium:   { label: "Medium",   dot: "bg-yellow-400", badge: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50", weight: 2  },
  low:      { label: "Low",      dot: "bg-blue-400",   badge: "text-blue-400 bg-blue-950/50 border-blue-900/50",       weight: 0.5},
  info:     { label: "Info",     dot: "bg-zinc-500",   badge: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50",       weight: 0  },
} as const;

export type SeverityKey = keyof typeof SEVERITY_CONFIG;

export const SUBMISSION_STATUS_CONFIG = {
  new:        { label: "New",       dot: "bg-sky-400",     badge: "text-sky-400 bg-sky-950/50 border-sky-900/50"             },
  triaging:   { label: "Triaging",  dot: "bg-violet-400",  badge: "text-violet-400 bg-violet-950/50 border-violet-900/50"    },
  needs_info: { label: "Info Req",  dot: "bg-yellow-400",  badge: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50"    },
  accepted:   { label: "Accepted",  dot: "bg-emerald-400", badge: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50" },
  rejected:   { label: "Rejected",  dot: "bg-red-400",     badge: "text-red-400 bg-red-950/50 border-red-900/50"             },
  duplicate:  { label: "Duplicate", dot: "bg-zinc-500",    badge: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"          },
  wont_fix:   { label: "Won't Fix", dot: "bg-zinc-600",    badge: "text-zinc-500 bg-zinc-900/50 border-zinc-800/50"          },
  resolved:   { label: "Resolved",  dot: "bg-teal-400",    badge: "text-teal-400 bg-teal-950/50 border-teal-900/50"          },
} as const;

export const CONTEST_STATUS_CONFIG = {
  draft:    { label: "Draft",    badge: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"           },
  open:     { label: "Open",     badge: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50"  },
  judging:  { label: "Judging",  badge: "text-violet-400 bg-violet-950/50 border-violet-900/50"     },
  complete: { label: "Complete", badge: "text-teal-400 bg-teal-950/50 border-teal-900/50"           },
  archived: { label: "Archived", badge: "text-zinc-500 bg-zinc-900/50 border-zinc-800/50"           },
} as const;

export const ENGAGEMENT_STATUS_CONFIG = {
  scheduled:   { label: "Scheduled",   badge: "text-sky-400 bg-sky-950/50 border-sky-900/50"             },
  in_progress: { label: "In Progress", badge: "text-violet-400 bg-violet-950/50 border-violet-900/50"    },
  completed:   { label: "Completed",   badge: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50" },
  cancelled:   { label: "Cancelled",   badge: "text-zinc-500 bg-zinc-800/50 border-zinc-700/50"          },
} as const;

export const CTF_DIFF_CONFIG = {
  easy:   { label: "Easy",   badge: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50" },
  medium: { label: "Medium", badge: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50"   },
  hard:   { label: "Hard",   badge: "text-orange-400 bg-orange-950/50 border-orange-900/50"   },
  insane: { label: "Insane", badge: "text-red-400 bg-red-950/50 border-red-900/50"             },
} as const;

export const REWARD_STATUS_CONFIG = {
  pending:  { label: "Pending Approval", badge: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50" },
  approved: { label: "Approved",         badge: "text-teal-400 bg-teal-950/50 border-teal-900/50"       },
  paid:     { label: "Paid",             badge: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50" },
  declined: { label: "Declined",         badge: "text-red-400 bg-red-950/50 border-red-900/50"           },
} as const;

export const TYPE = {
  h1:      "text-xl font-semibold tracking-tight",
  h2:      "text-lg font-semibold",
  h3:      "text-sm font-medium",
  label:   "text-[11px] font-medium text-vault-muted uppercase tracking-wide",
  body:    "text-sm text-vault-text leading-relaxed",
  muted:   "text-sm text-vault-muted",
  xs:      "text-xs text-vault-muted",
  mono:    "text-xs font-mono text-vault-subtle",
  badge:   "text-[10px] font-medium px-2 py-0.5 rounded-full border",
  badgeSm: "text-[10px] font-medium px-1.5 py-0.5 rounded border",
} as const;

export const ICON = {
  xs:  "w-3 h-3",
  sm:  "w-3.5 h-3.5",
  md:  "w-4 h-4",
  lg:  "w-5 h-5",
  xl:  "w-6 h-6",
  xxl: "w-8 h-8",
} as const;

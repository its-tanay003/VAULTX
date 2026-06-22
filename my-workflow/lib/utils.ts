import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SeverityLevel, SubmissionStatus, ProgramStatus } from "./supabase/types";

/* ─── Tailwind class merging ──────────────────────────────────────────────── */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ─── Severity helpers ────────────────────────────────────────────────────── */
export const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; color: string; bg: string; dot: string }
> = {
  critical: { label: "Critical", color: "text-red-400",    bg: "bg-red-950/60 border-red-900/50",    dot: "bg-red-400" },
  high:     { label: "High",     color: "text-orange-400", bg: "bg-orange-950/60 border-orange-900/50", dot: "bg-orange-400" },
  medium:   { label: "Medium",   color: "text-yellow-400", bg: "bg-yellow-950/60 border-yellow-900/50", dot: "bg-yellow-400" },
  low:      { label: "Low",      color: "text-blue-400",   bg: "bg-blue-950/60 border-blue-900/50",   dot: "bg-blue-400" },
  info:     { label: "Info",     color: "text-zinc-400",   bg: "bg-zinc-800/60 border-zinc-700/50",   dot: "bg-zinc-400" },
};

/* ─── Status helpers ──────────────────────────────────────────────────────── */
export const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; color: string; dot: string }
> = {
  new:        { label: "New",         color: "text-sky-400",    dot: "bg-sky-400" },
  triaging:   { label: "Triaging",    color: "text-violet-400", dot: "bg-violet-400" },
  needs_info: { label: "Needs Info",  color: "text-yellow-400", dot: "bg-yellow-400" },
  accepted:   { label: "Accepted",    color: "text-emerald-400",dot: "bg-emerald-400" },
  rejected:   { label: "Rejected",    color: "text-red-400",    dot: "bg-red-400" },
  duplicate:  { label: "Duplicate",   color: "text-zinc-400",   dot: "bg-zinc-400" },
  wont_fix:   { label: "Won't Fix",   color: "text-zinc-400",   dot: "bg-zinc-500" },
  resolved:   { label: "Resolved",    color: "text-teal-400",   dot: "bg-teal-400" },
};

export const PROGRAM_STATUS_CONFIG: Record<
  ProgramStatus,
  { label: string; color: string; dot: string }
> = {
  draft:    { label: "Draft",    color: "text-zinc-400",    dot: "bg-zinc-500" },
  active:   { label: "Active",   color: "text-emerald-400", dot: "bg-emerald-400" },
  paused:   { label: "Paused",   color: "text-yellow-400",  dot: "bg-yellow-400" },
  archived: { label: "Archived", color: "text-zinc-500",    dot: "bg-zinc-600" },
};

/* ─── Formatters ──────────────────────────────────────────────────────────── */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatRelativeTime(dateStr: string): string {
  const date  = new Date(dateStr);
  const now   = new Date();
  const diffS = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffS < 60)      return "just now";
  if (diffS < 3600)    return `${Math.floor(diffS / 60)}m ago`;
  if (diffS < 86400)   return `${Math.floor(diffS / 3600)}h ago`;
  if (diffS < 604800)  return `${Math.floor(diffS / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

/* ─── String utilities ────────────────────────────────────────────────────── */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ─── SHA-256 hash (for duplicate detection stage 1) ─────────────────────── */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data    = encoder.encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

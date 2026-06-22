import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./animated-counter";

/**
 * UPDATED Week 7: numeric values now count up on first view via
 * AnimatedCounter. String values (e.g. "34%", "$8.2K") render as
 * static text since they aren't safe to animate numerically.
 */

interface StatCardProps {
  label:        string;
  value:        string | number;
  trend?:       number;
  trendLabel?:  string;
  icon?:        React.ReactNode;
  accent?:      "teal" | "green" | "red" | "amber" | "blue";
  className?:   string;
  loading?:     boolean;
  prefix?:      string;   // e.g. "$" — only used when value is numeric
  suffix?:      string;   // e.g. "%" — only used when value is numeric
}

const ACCENT_CLASSES = {
  teal:  "text-teal-400  bg-teal-950/50  border-teal-900/40",
  green: "text-green-400 bg-green-950/50 border-green-900/40",
  red:   "text-red-400   bg-red-950/50   border-red-900/40",
  amber: "text-amber-400 bg-amber-950/50 border-amber-900/40",
  blue:  "text-blue-400  bg-blue-950/50  border-blue-900/40",
};

export function StatCard({
  label, value, trend, trendLabel, icon, accent = "teal", className, loading,
  prefix = "", suffix = "",
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("vault-card p-5", className)}>
        <div className="skeleton h-3 w-24 mb-3" />
        <div className="skeleton h-8 w-16 mb-2" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }

  return (
    <div className={cn(
      "vault-card p-5 group hover:border-vault-border-bright transition-colors duration-150",
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-vault-muted font-medium">{label}</span>
        {icon && (
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border text-sm",
            ACCENT_CLASSES[accent]
          )}>
            {icon}
          </div>
        )}
      </div>

      <div className="text-3xl font-semibold tracking-tight mb-2">
        {typeof value === "number"
          ? <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
          : value}
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            trend > 0  ? "text-green-400"
            : trend < 0 ? "text-red-400"
            : "text-vault-muted"
          )}>
            {trend > 0
              ? <TrendingUp className="w-3 h-3" />
              : trend < 0
              ? <TrendingDown className="w-3 h-3" />
              : <Minus className="w-3 h-3" />}
            {trend > 0 ? "+" : ""}{trend}%
          </div>
          {trendLabel && <span className="text-xs text-vault-muted">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

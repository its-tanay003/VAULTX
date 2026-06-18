import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  icon:        React.ReactNode;
  title:       string;
  description: string;
  action?:     { href: string; label: string };
  className?:  string;
  compact?:    boolean;
}

/**
 * Standardizes the empty state pattern that was independently
 * reimplemented (slightly differently each time) across the org
 * dashboard, researcher dashboard, programs list, submissions list,
 * code quality page, and rewards pages in Weeks 1-6.
 *
 * Usage:
 *   <EmptyState
 *     icon={<Bug className="w-6 h-6" />}
 *     title="No submissions yet"
 *     description="Create an active program to start receiving reports"
 *     action={{ href: "/dashboard/org/programs/new", label: "Create program" }}
 *   />
 */
export function EmptyState({ icon, title, description, action, className, compact }: Props) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-10 px-4" : "py-16 px-6",
      className
    )}>
      <div className={cn(
        "rounded-2xl bg-vault-elevated border border-vault-border flex items-center justify-center mb-4",
        compact ? "w-10 h-10" : "w-12 h-12"
      )}>
        <span className="text-vault-muted opacity-70">{icon}</span>
      </div>
      <p className={cn("font-medium mb-1", compact ? "text-sm" : "text-base")}>{title}</p>
      <p className={cn(
        "text-vault-muted mb-5",
        compact ? "text-xs max-w-[220px]" : "text-sm max-w-xs"
      )}>
        {description}
      </p>
      {action && (
        <Link href={action.href} className="btn-teal text-sm">
          {action.label}
        </Link>
      )}
    </div>
  );
}

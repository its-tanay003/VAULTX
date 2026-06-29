import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — replaces 14 different hand-rolled header patterns.
 *
 * Before (every page did this slightly differently):
 *   <div className="flex items-center gap-3">
 *     <Link href="..." className="text-vault-muted hover:text-vault-text mt-1">
 *       <ChevronLeft className="w-4 h-4" />
 *     </Link>
 *     <div>
 *       <h1 className="text-xl font-semibold flex items-center gap-2">
 *         <Icon /> Title
 *       </h1>
 *       <p className="text-sm text-vault-muted">Subtitle</p>
 *     </div>
 *   </div>
 *
 * After:
 *   <PageHeader
 *     title="PTaaS"
 *     subtitle="Scoped penetration testing engagements"
 *     icon={<Shield className="w-5 h-5 text-vault-teal" />}
 *     backHref="/dashboard/ptaas"
 *     actions={<Link href="..." className="btn-teal">New</Link>}
 *   />
 */

interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  icon?:     React.ReactNode;
  backHref?: string;
  actions?:  React.ReactNode;
  meta?:     React.ReactNode;   // extra info line (dates, status, etc.)
  className?: string;
}

export function PageHeader({
  title, subtitle, icon, backHref, actions, meta, className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 flex-wrap", className)}>
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="text-vault-muted hover:text-vault-text transition-colors mt-1 shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        )}
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2 leading-tight">
            {icon}
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-vault-muted mt-0.5">{subtitle}</p>
          )}
          {meta && (
            <div className="flex items-center gap-2 flex-wrap mt-1.5 text-sm text-vault-muted">
              {meta}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

"use client";

import { ChevronRight, Search } from "lucide-react";
import { usePathname }          from "next/navigation";
import { NotificationBell }     from "@/components/realtime/notification-bell";
import { MobileSidebar }        from "@/components/layout/mobile-sidebar";
import { useCommandPaletteContext } from "@/components/providers/command-palette-provider";
import type { Profile }         from "@/lib/supabase/types";
import { cn }                   from "@/lib/utils";

const ROUTE_LABELS: Record<string, string> = {
  org: "Overview", researcher: "Overview", programs: "Programs",
  submissions: "Submissions", triagers: "Triagers", rewards: "Rewards",
  notifications: "Notifications", settings: "Settings", new: "New", edit: "Edit",
  "code-quality": "Code Quality", leaderboard: "Leaderboard", profile: "Profile",
};

interface HeaderProps { profile: Profile }

/**
 * UPDATED Week 7 (final):
 *  - Mobile hamburger trigger (MobileSidebar) on the left, hidden md:up
 *  - Search button collapses to icon-only below sm breakpoint
 *  - Breadcrumbs truncate to last 2 segments on narrow viewports
 *  - Search button opens the ⌘K command palette via context
 */
export function Header({ profile }: HeaderProps) {
  const pathname = usePathname();
  const { open: openCommandPalette } = useCommandPaletteContext();

  const parts  = pathname.split("/").filter(Boolean);
  const crumbs = parts.map((p, i) => ({
    label: ROUTE_LABELS[p] ?? (p.length === 36 ? p.slice(0, 8) + "…" : p),
    href:  "/" + parts.slice(0, i + 1).join("/"),
    last:  i === parts.length - 1,
  }));

  const visibleCrumbs = crumbs.length > 2 ? crumbs.slice(-2) : crumbs;

  return (
    <header className="h-14 border-b border-vault-border bg-vault-surface/80 backdrop-blur-sm flex items-center gap-3 px-4 sm:px-6 shrink-0">
      <MobileSidebar
        role={profile.role}
        fullName={profile.full_name}
        email={profile.email}
        avatarUrl={profile.avatar_url}
      />

      <nav className="flex items-center gap-1 text-sm flex-1 min-w-0">
        {visibleCrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="w-3 h-3 text-vault-muted shrink-0" />}
            <span className={cn("truncate", crumb.last ? "text-vault-text font-medium" : "text-vault-muted")}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      <button
        onClick={openCommandPalette}
        className={cn(
          "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-vault-muted",
          "border border-vault-border bg-vault-elevated",
          "hover:border-vault-border-bright hover:text-vault-text transition-all duration-150"
        )}
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search…</span>
        <kbd className="ml-3 text-[10px] px-1.5 py-0.5 bg-vault-surface border border-vault-border rounded font-mono">
          ⌘K
        </kbd>
      </button>
      <button
        onClick={openCommandPalette}
        className="sm:hidden text-vault-muted hover:text-vault-text transition-colors p-1"
        aria-label="Open search"
      >
        <Search className="w-4.5 h-4.5" />
      </button>

      <NotificationBell userId={profile.id} />
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck, LayoutDashboard, Target, Bug, FileSearch,
  Trophy, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, Zap, Code2, Bell, BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn }            from "@/lib/utils";
import { useState }      from "react";
import type { UserRole } from "@/lib/supabase/types";

/**
 * UPDATED Week 8: STUB_MODULES (PTaaS, AI Red Team) are now real <Link>s
 * pointing to their dedicated stub pages instead of unclickable divs.
 * "Coming soon" badge stays, but clicking now lands on a real page with
 * a roadmap preview and a waitlist signup — no more dead ends in the nav.
 */

const ORG_NAV = [
  { href: "/dashboard/org",             icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/org/programs",    icon: Target,          label: "Programs" },
  { href: "/dashboard/org/submissions", icon: Bug,             label: "Submissions" },
  { href: "/dashboard/org/rewards",     icon: Trophy,          label: "Rewards" },
  { href: "/dashboard/ptaas",           icon: Shield,          label: "PTaaS" },
  { href: "/dashboard/code-quality",    icon: Code2,           label: "Code Quality" },
  { href: "/dashboard/ai-red-team",     icon: Zap,             label: "AI Red Team" },
];

const RESEARCHER_NAV = [
  { href: "/dashboard/researcher",             icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/researcher/programs",    icon: Target,          label: "Programs" },
  { href: "/dashboard/researcher/submissions", icon: FileSearch,      label: "My Reports" },
  { href: "/dashboard/researcher/rewards",     icon: Trophy,          label: "Earnings" },
  { href: "/dashboard/ptaas",                   icon: Shield,          label: "PTaaS" },
  { href: "/dashboard/researcher/leaderboard", icon: BarChart3,       label: "Leaderboard" },
  { href: "/dashboard/code-quality",           icon: Code2,           label: "Code Quality" },
];

const BOTTOM_NAV = [
  { href: "/dashboard/notifications", icon: Bell,     label: "Notifications" },
  { href: "/dashboard/settings",      icon: Settings, label: "Settings" },
];

const STUB_MODULES: { href: string; icon: any; label: string; badge?: string }[] = [];

interface SidebarProps {
  role:      UserRole;
  fullName:  string | null;
  email:     string;
  avatarUrl: string | null;
}

export function Sidebar({ role, fullName, email, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = role === "org" || role === "triager" ? ORG_NAV : RESEARCHER_NAV;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isActive = (href: string) =>
    href === "/dashboard/org" || href === "/dashboard/researcher"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <aside className={cn(
      "hidden md:flex flex-col h-full bg-vault-surface border-r border-vault-border transition-all duration-200",
      collapsed ? "w-14" : "w-56"
    )}>
      <div className={cn(
        "flex items-center h-14 border-b border-vault-border px-3 shrink-0",
        collapsed ? "justify-center" : "gap-2.5"
      )}>
        <div className="w-7 h-7 rounded-lg bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-vault-teal" />
        </div>
        {!collapsed && <span className="font-semibold tracking-tight text-sm">VAULTX</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn("ml-auto text-vault-muted hover:text-vault-text transition-colors", collapsed && "ml-0")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn("nav-item", isActive(href) && "active", collapsed && "justify-center px-0")}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}

        {!collapsed && (
          <div className="pt-3 pb-1">
            <div className="px-3 mb-1.5 text-[10px] font-medium text-vault-muted uppercase tracking-wider">
              Roadmap
            </div>
            {STUB_MODULES.map(({ href, icon: Icon, label, badge }) => (
              <Link
                key={href}
                href={href}
                className={cn("nav-item", isActive(href) && "active")}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
                <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 bg-vault-teal/10 text-vault-teal rounded">
                  {badge}
                </span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="p-2 border-t border-vault-border space-y-0.5">
        {BOTTOM_NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn("nav-item", isActive(href) && "active", collapsed && "justify-center px-0")}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}

        <div className={cn(
          "mt-2 pt-2 border-t border-vault-border flex items-center gap-2.5",
          collapsed ? "justify-center" : "px-1"
        )}>
          <div className="w-7 h-7 rounded-full bg-vault-teal/20 border border-vault-teal/30 flex items-center justify-center text-vault-teal text-xs font-medium shrink-0 overflow-hidden">
            {avatarUrl
              ? <img src={avatarUrl} alt={fullName ?? ""} className="w-full h-full object-cover" />
              : (fullName?.[0] ?? email[0]).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{fullName ?? email}</div>
              <div className="text-[10px] text-vault-muted capitalize">{role}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleSignOut} className="text-vault-muted hover:text-red-400 transition-colors" aria-label="Sign out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

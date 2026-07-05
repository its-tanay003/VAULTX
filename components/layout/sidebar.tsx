"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck, LayoutDashboard, Target, Bug, FileSearch,
  Trophy, Settings, LogOut, ChevronLeft, ChevronRight,
  Code2, Bell, BarChart3, Shield, Zap, Flag, Scale, FileBarChart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn }            from "@/lib/utils";
import { useState }      from "react";
import type { UserRole } from "@/lib/supabase/types";

/**
 * UPDATED Week 15 (polish): sidebar now groups nav items into
 * logical sections to handle the full 8+ module set cleanly.
 * Collapsed state shows only icons — full labels on hover via title.
 *
 * Groups:
 *   CORE        — Dashboard, Programs, Submissions, Rewards
 *   SECURITY    — PTaaS, AI Red Team, Code Quality (org)
 *                 My Reports, Earnings, Leaderboard (researcher)
 *   COMPETITIONS — CTF, Contests
 *   TOOLS       — Code Quality (shared)
 *   ACCOUNT     — Notifications, Settings
 */

const ORG_CORE = [
  { href: "/dashboard/org",             icon: LayoutDashboard, label: "Overview"    },
  { href: "/dashboard/org/programs",    icon: Target,          label: "Programs"    },
  { href: "/dashboard/org/submissions", icon: Bug,             label: "Submissions" },
  { href: "/dashboard/org/rewards",     icon: Trophy,          label: "Rewards"     },
  { href: "/dashboard/org/reports",     icon: FileBarChart,    label: "Reports"     },
];

const ORG_SECURITY = [
  { href: "/dashboard/ptaas",       icon: Shield,  label: "PTaaS"        },
  { href: "/dashboard/ai-red-team", icon: Zap,     label: "AI Red Team"  },
  { href: "/dashboard/code-quality",icon: Code2,   label: "Code Quality" },
];

const RESEARCHER_CORE = [
  { href: "/dashboard/researcher",             icon: LayoutDashboard, label: "Overview"   },
  { href: "/dashboard/researcher/programs",    icon: Target,          label: "Programs"   },
  { href: "/dashboard/researcher/submissions", icon: FileSearch,      label: "My Reports" },
  { href: "/dashboard/researcher/rewards",     icon: Trophy,          label: "Earnings"   },
  { href: "/dashboard/researcher/leaderboard", icon: BarChart3,       label: "Leaderboard"},
];

const RESEARCHER_TOOLS = [
  { href: "/dashboard/code-quality", icon: Code2, label: "Code Quality" },
];

const COMPETITIONS = [
  { href: "/dashboard/ctf",      icon: Flag,  label: "CTF"      },
  { href: "/dashboard/contests", icon: Scale, label: "Contests" },
];

const ACCOUNT_NAV = [
  { href: "/dashboard/notifications", icon: Bell,     label: "Notifications" },
  { href: "/dashboard/settings",      icon: Settings, label: "Settings"      },
];

interface SidebarProps {
  role:      UserRole;
  fullName:  string | null;
  email:     string;
  avatarUrl: string | null;
}

export function Sidebar({ role, fullName, email, avatarUrl }: SidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();
  const [collapsed, setCollapsed] = useState(false);

  const isOrg = role === "org" || role === "triager";

  const coreNav      = isOrg ? ORG_CORE      : RESEARCHER_CORE;
  const securityNav  = isOrg ? ORG_SECURITY  : RESEARCHER_TOOLS;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isActive = (href: string) => {
    const exactRoutes = ["/dashboard/org", "/dashboard/researcher"];
    return exactRoutes.includes(href) ? pathname === href : pathname.startsWith(href);
  };

  function NavGroup({ label, items }: { label: string; items: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }[] }) {
    return (
      <div className="mb-1">
        {!collapsed && (
          <p className="px-3 mb-1 text-[9px] font-semibold text-vault-muted uppercase tracking-widest">
            {label}
          </p>
        )}
        {items.map(({ href, icon: Icon, label: itemLabel }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? itemLabel : undefined}
            className={cn(
              "nav-item",
              isActive(href) && "active",
              collapsed && "justify-center px-0"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{itemLabel}</span>}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <aside className={cn(
      "hidden md:flex flex-col h-full bg-vault-surface border-r border-vault-border transition-all duration-200",
      collapsed ? "w-14" : "w-56"
    )}>
      {/* Logo + collapse */}
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <NavGroup label="Core" items={coreNav} />
        <NavGroup label={isOrg ? "Security" : "Tools"} items={securityNav} />
        <NavGroup label="Competitions" items={COMPETITIONS} />
      </nav>

      {/* Account + user */}
      <div className="p-2 border-t border-vault-border">
        {ACCOUNT_NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn("nav-item", isActive(href) && "active", collapsed && "justify-center px-0")}
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
            <button
              onClick={handleSignOut}
              className="text-vault-muted hover:text-red-400 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

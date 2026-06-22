"use client";

import { useState } from "react";
import Link    from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, LayoutDashboard, Target, Bug, FileSearch,
  Trophy, Settings, LogOut, Menu, X, BarChart3, Code2,
  Bell, Shield, Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn }            from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";

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

const STUB_MODULES: { href: string; icon: any; label: string }[] = [];

interface Props {
  role:      UserRole;
  fullName:  string | null;
  email:     string;
  avatarUrl: string | null;
}

/**
 * Mobile-only navigation drawer. Rendered alongside (not replacing) the
 * desktop Sidebar — Sidebar hides itself below `md:` breakpoint via its
 * own className, and this component's trigger button only shows below
 * that same breakpoint. See Header for the trigger button placement.
 */
export function MobileSidebar({ role, fullName, email, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router    = useRouter();
  const supabase  = createClient();

  const navItems = role === "org" || role === "triager" ? ORG_NAV : RESEARCHER_NAV;
  const isActive = (href: string) =>
    href === "/dashboard/org" || href === "/dashboard/researcher"
      ? pathname === href
      : pathname.startsWith(href);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Trigger — only visible below md breakpoint */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden text-vault-muted hover:text-vault-text transition-colors p-1"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 z-[90] md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 w-72 bg-vault-surface border-r border-vault-border z-[91] md:hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between h-14 border-b border-vault-border px-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-vault-teal" />
                  </div>
                  <span className="font-semibold text-sm">VAULTX</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-vault-muted hover:text-vault-text transition-colors"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {navItems.map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isActive(href)
                        ? "text-vault-teal bg-vault-teal-faint border border-vault-border"
                        : "text-vault-muted hover:text-vault-text hover:bg-vault-elevated"
                    )}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    {label}
                  </Link>
                ))}

                <div className="pt-3 pb-1">
                  <div className="px-3 mb-1.5 text-[10px] font-medium text-vault-muted uppercase tracking-wider">
                    Coming soon
                  </div>
                  {STUB_MODULES.map(({ href, icon: Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                        isActive(href)
                          ? "text-vault-teal bg-vault-teal-faint border border-vault-border"
                          : "text-vault-muted hover:text-vault-text hover:bg-vault-elevated"
                      )}
                    >
                      <Icon className="w-4.5 h-4.5 shrink-0" /> {label}
                    </Link>
                  ))}
                </div>
              </nav>

              {/* Bottom */}
              <div className="p-3 border-t border-vault-border space-y-1">
                {BOTTOM_NAV.map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isActive(href)
                        ? "text-vault-teal bg-vault-teal-faint border border-vault-border"
                        : "text-vault-muted hover:text-vault-text hover:bg-vault-elevated"
                    )}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" /> {label}
                  </Link>
                ))}

                <div className="flex items-center gap-2.5 px-3 pt-3 mt-2 border-t border-vault-border">
                  <div className="w-8 h-8 rounded-full bg-vault-teal/20 border border-vault-teal/30 flex items-center justify-center text-vault-teal text-xs font-medium shrink-0 overflow-hidden">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      : (fullName?.[0] ?? email[0]).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{fullName ?? email}</p>
                    <p className="text-[10px] text-vault-muted capitalize">{role}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-vault-muted hover:text-red-400 transition-colors p-1"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

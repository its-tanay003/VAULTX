"use client";

import Link      from "next/link";
import { usePathname } from "next/navigation";
import {
  User, Lock, Bell, Eye, Plug, Key, Building2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href:    string;
  icon:    React.ElementType;
  label:   string;
  orgOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/settings/profile",       icon: User,          label: "Profile",       orgOnly: false },
  { href: "/dashboard/settings/security",      icon: Lock,          label: "Security",      orgOnly: false },
  { href: "/dashboard/settings/notifications", icon: Bell,          label: "Notifications", orgOnly: false },
  { href: "/dashboard/settings/privacy",       icon: Eye,           label: "Privacy",       orgOnly: false },
  { href: "/dashboard/settings/integrations",  icon: Plug,          label: "Integrations",  orgOnly: false },
  { href: "/dashboard/settings/api-keys",      icon: Key,           label: "API Keys",      orgOnly: false },
  { href: "/dashboard/settings/organization",  icon: Building2,     label: "Organization",  orgOnly: true  },
  { href: "/dashboard/settings/danger",        icon: AlertTriangle, label: "Danger Zone",   orgOnly: false },
];

interface SettingsNavProps {
  isOrg: boolean;
}

export function SettingsNav({ isOrg }: SettingsNavProps) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((i) => !i.orgOnly || isOrg);

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href);
        const isDanger = href.includes("danger");

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              active
                ? isDanger
                  ? "bg-red-500/10 text-red-400 font-medium"
                  : "bg-vault-teal/10 text-vault-teal font-medium"
                : isDanger
                  ? "text-red-400/70 hover:text-red-400 hover:bg-red-500/5"
                  : "text-vault-muted hover:text-vault-text hover:bg-vault-elevated/50"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

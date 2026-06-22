import Link from "next/link";
import { Bell, User, Building2, ChevronRight, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import { ThemeToggle }   from "@/components/ui/theme-toggle";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

/**
 * UPDATED Week 7: adds an Appearance card with the dark/light ThemeToggle,
 * inline rather than a separate page since it's a single control.
 */
export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const SECTIONS = [
    { href: "/dashboard/settings/profile",       icon: User,     label: "Profile",       desc: "Name, username, bio, social links" },
    { href: "/dashboard/settings/notifications",  icon: Bell,     label: "Notifications", desc: "Email and in-app notification preferences" },
    ...(profile?.role === "org" ? [{
      href: "/dashboard/settings/organization", icon: Building2, label: "Organization", desc: "Org name, logo, website, team members",
    }] : []),
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-vault-muted mt-0.5">Manage your account preferences</p>
      </div>

      {/* Appearance */}
      <div className="vault-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-vault-teal" />
          <h3 className="text-sm font-medium">Appearance</h3>
        </div>
        <ThemeToggle />
      </div>

      {/* Other sections */}
      <div className="vault-card divide-y divide-vault-border">
        {SECTIONS.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3.5 p-4 hover:bg-vault-elevated/50 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5 text-vault-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium group-hover:text-vault-teal transition-colors">{label}</p>
              <p className="text-xs text-vault-muted">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-vault-muted group-hover:text-vault-teal transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

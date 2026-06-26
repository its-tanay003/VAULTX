import Link               from "next/link";
import { ChevronLeft }    from "lucide-react";
import { createClient }   from "@/lib/supabase/server";
import { redirect }       from "next/navigation";
import { SettingsNav }    from "@/components/settings/settings-nav";
import type { Metadata }  from "next";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOrg = profile?.role === "org" || profile?.role === "triager" || profile?.role === "admin";

  return (
    <div className="max-w-4xl mx-auto animate-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="text-vault-muted hover:text-vault-text transition-colors"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-vault-muted">Manage your account and preferences</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Left nav */}
        <aside className="w-48 shrink-0 vault-card p-3">
          <SettingsNav isOrg={isOrg} />
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-5">
          {children}
        </main>
      </div>
    </div>
  );
}

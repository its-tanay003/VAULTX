import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header }  from "@/components/layout/header";
import { PageTransition }          from "@/components/providers/page-transition";
import { CommandPaletteProvider }  from "@/components/providers/command-palette-provider";
import { SkipToContent }           from "@/components/ui/skip-to-content";
import { VaultContextProvider }    from "@/components/vault/vault-context";
import { VaultWidget }             from "@/components/vault/vault-widget";

/**
 * UPDATED Week 7 (final):
 *  - <SkipToContent> is the first child — keyboard users can tab directly
 *    to #main-content, bypassing sidebar + header navigation
 *  - <PageTransition> wraps {children} for fade+rise on every nav
 *  - <CommandPaletteProvider> makes ⌘K work platform-wide
 *  - main padding is responsive (p-4 mobile, p-6 desktop)
 *  - Sidebar hides below md:; MobileSidebar (inside Header) takes over
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();

  if (!profile?.is_onboarded) redirect("/onboarding");

  return (
    <CommandPaletteProvider role={profile.role}>
      <VaultContextProvider>
        <SkipToContent />
        <div className="flex h-screen bg-vault-bg overflow-hidden">
          <Sidebar
            role={profile.role}
            fullName={profile.full_name}
            email={profile.email}
            avatarUrl={profile.avatar_url}
          />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Header profile={profile} />
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 sm:p-6 outline-none">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
        <VaultWidget role={profile.role === "researcher" ? "researcher" : "admin"} />
      </VaultContextProvider>
    </CommandPaletteProvider>
  );
}

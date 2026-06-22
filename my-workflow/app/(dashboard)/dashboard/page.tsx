import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardRedirectPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile: any = data;

  if (!profile) {
    // Fallback if profile row is not found (e.g. database schema not fully set up)
    redirect("/onboarding");
  }

  if (!profile.is_onboarded) {
    redirect("/onboarding");
  }

  if (profile.role === "org" || profile.role === "triager") {
    redirect("/dashboard/org");
  } else {
    redirect("/dashboard/researcher");
  }
}

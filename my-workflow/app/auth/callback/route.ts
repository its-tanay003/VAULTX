import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has completed onboarding
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_onboarded")
          .eq("id", user.id)
          .single();

        const destination = profile?.is_onboarded ? next : "/onboarding";
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  // Auth failure → back to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

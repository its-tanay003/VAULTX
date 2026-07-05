import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccountStatus } from "@/lib/stripe/client";

/**
 * GET /api/stripe/onboarding-return
 *
 * Stripe redirects here both on successful completion and on a
 * refresh (expired link, user navigated away). Either way we re-check
 * the account's actual status with Stripe rather than trusting the
 * redirect itself — Stripe's return_url fires even if onboarding was
 * abandoned partway through, so "we got redirected here" does not
 * mean "onboarding succeeded."
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const isRefresh = url.searchParams.get("refresh") === "true";

  const redirectTo = (query: string) =>
    NextResponse.redirect(new URL(`/dashboard/researcher/payouts${query}`, url.origin));

  if (isRefresh) {
    // The onboarding link itself expired before the user finished —
    // send them back to request a fresh one rather than erroring.
    return redirectTo("?stripe=link_expired");
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login", url.origin));

    const { data: profile } = await supabase
      .from("profiles").select("stripe_account_id").eq("id", user.id).single();

    if (!profile?.stripe_account_id) {
      return redirectTo("?stripe=error");
    }

    const status = await getAccountStatus(profile.stripe_account_id);

    await supabase
      .from("profiles")
      .update({
        stripe_onboarding_complete: status.onboardingComplete,
        stripe_payouts_enabled:     status.payoutsEnabled,
      })
      .eq("id", user.id);

    return redirectTo(status.payoutsEnabled ? "?stripe=connected" : "?stripe=incomplete");
  } catch (err: unknown) {
    console.error("[Stripe Onboarding Return] Failed:", err);
    return redirectTo("?stripe=error");
  }
}

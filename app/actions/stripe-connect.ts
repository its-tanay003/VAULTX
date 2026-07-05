"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createConnectedAccount, createOnboardingLink, getAccountStatus } from "@/lib/stripe/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Starts (or resumes) Stripe Connect onboarding for the authenticated
 * researcher. Creates a Connect account on first call; every call
 * generates a fresh onboarding link since Stripe's links expire in
 * minutes and can't be reused or cached.
 */
export async function startStripeOnboarding(): Promise<{ url: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id, email, role")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  if (profile.role !== "researcher") {
    throw new Error("Only researcher accounts receive payouts through Stripe Connect");
  }

  let accountId = profile.stripe_account_id;
  if (!accountId) {
    accountId = await createConnectedAccount(profile.email);
    await supabase.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
  }

  const url = await createOnboardingLink(
    accountId,
    `${APP_URL}/api/stripe/onboarding-return`,
    `${APP_URL}/api/stripe/onboarding-return?refresh=true`
  );

  return { url };
}

/**
 * Re-checks onboarding/payout status with Stripe and syncs it to
 * profiles. Called from the onboarding-return callback route, and can
 * be called manually from the payouts page ("Refresh status") in case
 * Stripe's redirect didn't fire (browser back button, etc).
 */
export async function refreshStripeStatus(): Promise<{ onboardingComplete: boolean; payoutsEnabled: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles").select("stripe_account_id").eq("id", user.id).single();

  if (!profile?.stripe_account_id) {
    return { onboardingComplete: false, payoutsEnabled: false };
  }

  const status = await getAccountStatus(profile.stripe_account_id);

  await supabase
    .from("profiles")
    .update({
      stripe_onboarding_complete: status.onboardingComplete,
      stripe_payouts_enabled:     status.payoutsEnabled,
    })
    .eq("id", user.id);

  revalidatePath("/dashboard/researcher/payouts");
  return status;
}

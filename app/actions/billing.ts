"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createOrGetStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession,
} from "@/lib/billing/stripe-billing-client";

/**
 * Helper to assert that the current user is authenticated
 * and is the owner of the organization they are querying.
 */
async function assertOrgOwnerAccess(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Get user profile role & org_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.org_id) {
    throw new Error("User has no active organization");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, owner_id, stripe_customer_id")
    .eq("id", profile.org_id)
    .single();

  if (!org) {
    throw new Error("Organization not found");
  }

  if (org.owner_id !== user.id) {
    throw new Error("Access denied: only the organization owner can manage billing");
  }

  return { user, org };
}

/**
 * Starts a Stripe checkout session for purchasing a plan.
 */
export async function startCheckout(
  planId: string,
  billingCycle: "monthly" | "yearly"
): Promise<string> {
  const supabase = createClient();
  const { user, org } = await assertOrgOwnerAccess(supabase);

  // Retrieve plan details
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!plan) {
    throw new Error("Plan not found");
  }

  const priceId =
    billingCycle === "monthly"
      ? plan.stripe_price_id_monthly
      : plan.stripe_price_id_yearly;

  if (!priceId) {
    throw new Error(`Plan has no active price configured for cycle: ${billingCycle}`);
  }

  // Get or Create Stripe Customer
  let stripeCustomerId = org.stripe_customer_id;
  if (!stripeCustomerId) {
    stripeCustomerId = await createOrGetStripeCustomer({
      orgId: org.id,
      name: org.name,
      email: user.email || "",
    });

    // Save Customer ID back to the organization
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", org.id);

    if (updateError) {
      throw new Error(`Failed to save Stripe customer details: ${updateError.message}`);
    }
  }

  // Configure return redirect paths
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const successUrl = `${origin}/api/billing/checkout-return?status=success`;
  const cancelUrl = `${origin}/api/billing/checkout-return?status=cancel`;

  return await createCheckoutSession({
    stripeCustomerId,
    priceId,
    successUrl,
    cancelUrl,
    orgId: org.id,
  });
}

/**
 * Generates a self-serve Stripe customer portal link for plan changes/cancellation.
 */
export async function openBillingPortal(): Promise<string> {
  const supabase = createClient();
  const { user, org } = await assertOrgOwnerAccess(supabase);

  let stripeCustomerId = org.stripe_customer_id;
  if (!stripeCustomerId) {
    stripeCustomerId = await createOrGetStripeCustomer({
      orgId: org.id,
      name: org.name,
      email: user.email || "",
    });

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", org.id);

    if (updateError) {
      throw new Error(`Failed to save Stripe customer details: ${updateError.message}`);
    }
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const returnUrl = `${origin}/dashboard/settings/organization`;

  return await createBillingPortalSession({
    stripeCustomerId,
    returnUrl,
  });
}

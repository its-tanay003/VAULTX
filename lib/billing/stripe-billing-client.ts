/**
 * VAULTX Stripe Billing Client
 *
 * SERVER-ONLY. Wraps the Stripe SDK to manage SaaS subscriptions, customer records,
 * checkout sessions, and access to the Stripe Customer Portal.
 */

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");

  stripeClient = new Stripe(key, { apiVersion: "2024-06-20" });
  return stripeClient;
}

/**
 * Creates a Stripe customer for an organization if one doesn't exist,
 * or retrieves their existing customer details.
 */
export async function createOrGetStripeCustomer(params: {
  orgId: string;
  name: string;
  email: string;
}): Promise<string> {
  const stripe = getStripe();

  // We check if the customer already exists in our Stripe account
  // using metadata search, just in case our local database mapping was lost
  const existing = await stripe.customers.search({
    query: `metadata['org_id']:'${params.orgId}'`,
    limit: 1,
  });

  if (existing.data.length > 0 && existing.data[0]) {
    return existing.data[0].id;
  }

  const customer = await stripe.customers.create({
    name: params.name,
    email: params.email,
    metadata: {
      org_id: params.orgId,
    },
  });

  return customer.id;
}

/**
 * Creates a Stripe Checkout Session for a subscription purchase.
 */
export async function createCheckoutSession(params: {
  stripeCustomerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  orgId: string;
}): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    customer: params.stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    metadata: {
      org_id: params.orgId,
    },
    subscription_data: {
      metadata: {
        org_id: params.orgId,
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout session URL");
  }

  return session.url;
}

/**
 * Creates a link to Stripe's self-serve Customer Portal.
 */
export async function createBillingPortalSession(params: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });

  return session.url;
}

/**
 * Retrieves full details of a subscription from Stripe.
 */
export async function getSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return await stripe.subscriptions.retrieve(stripeSubscriptionId);
}

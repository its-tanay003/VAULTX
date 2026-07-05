/**
 * VAULTX Stripe Connect Client
 *
 * SERVER-ONLY. Wraps the Stripe SDK for the two things this platform
 * needs: (1) letting researchers onboard a Connect Express account to
 * receive payouts, and (2) transferring approved reward amounts to
 * that account.
 *
 * Uses Express accounts (not Standard or Custom) — Express gives
 * Stripe's own hosted onboarding UI (KYC, bank details, tax info),
 * which is the right tradeoff for a zero-budget platform: no need to
 * build or maintain compliance UI ourselves.
 *
 * Money-movement safety: every transfer call in this file requires an
 * explicit `idempotencyKey`. Callers (app/actions/rewards.ts) always
 * pass the reward's own id as that key, so a retried request — network
 * blip, duplicate button click, a cron re-running — can never create
 * a second real transfer for the same reward. This is Stripe's own
 * mechanism for exactly this failure mode, not something bespoke.
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

/** Creates a new Express Connect account for a researcher. One-time; the id is stored on profiles.stripe_account_id. */
export async function createConnectedAccount(email: string): Promise<string> {
  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      transfers: { requested: true },
    },
  });
  return account.id;
}

/** Generates a one-time-use Stripe-hosted onboarding link. Links expire quickly (a few minutes) — always generate fresh, never cache. */
export async function createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
  return link.url;
}

export interface AccountStatus {
  onboardingComplete: boolean;
  payoutsEnabled:     boolean;
}

/** Checks whether a Connect account has finished onboarding and can receive transfers. */
export async function getAccountStatus(accountId: string): Promise<AccountStatus> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  return {
    onboardingComplete: !!account.details_submitted,
    payoutsEnabled:     !!account.payouts_enabled,
  };
}

export interface TransferResult {
  transferId: string;
}

/**
 * Transfers reward funds to a researcher's connected account.
 * `idempotencyKey` should always be the reward's own id — see the
 * module-level note above on why this isn't optional in practice.
 */
export async function createTransfer(params: {
  accountId:      string;
  amountCents:    number;
  currency:       string;
  idempotencyKey: string;
  metadata:       Record<string, string>;
}): Promise<TransferResult> {
  const stripe = getStripe();
  const transfer = await stripe.transfers.create(
    {
      amount:      params.amountCents,
      currency:    params.currency.toLowerCase(),
      destination: params.accountId,
      metadata:    params.metadata,
    },
    { idempotencyKey: params.idempotencyKey }
  );
  return { transferId: transfer.id };
}

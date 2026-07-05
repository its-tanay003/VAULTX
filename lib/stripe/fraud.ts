/**
 * VAULTX Payout Fraud Detection
 *
 * Deliberately built on one concrete, real signal rather than a
 * fabricated "ML fraud model": Stripe assigns every bank account a
 * `fingerprint` that's identical across accounts if the underlying
 * bank account is the same. If two different researcher profiles'
 * Connect accounts share a fingerprint, the same physical bank
 * account is receiving payouts under two identities — a real,
 * concrete duplicate-account signal, not a guess.
 *
 * This is intentionally narrow. A genuine fraud-detection system for
 * a payments platform (velocity checks, device fingerprinting, IP
 * clustering, behavioral scoring) is its own substantial project —
 * flagging that scope gap explicitly rather than implying this covers
 * more than it does.
 */

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

/**
 * Scans all researchers with a connected Stripe account for shared
 * bank account fingerprints, writing any new collisions to
 * payout_fraud_flags. Re-running won't duplicate an unresolved flag
 * for the same researcher + fingerprint pair.
 *
 * Run this from an admin action, not automatically on every payout —
 * it makes one Stripe API call per connected account.
 */
export async function scanForDuplicateBankAccounts(): Promise<{ flagged: number }> {
  const supabase = createAdminClient();
  const stripe = getStripe();

  const { data: researchers } = await supabase
    .from("profiles")
    .select("id, full_name, username, stripe_account_id")
    .eq("role", "researcher")
    .not("stripe_account_id", "is", null);

  if (!researchers?.length) return { flagged: 0 };

  const fingerprintMap = new Map<string, string[]>();

  for (const researcher of researchers) {
    try {
      const accounts = await stripe.accounts.listExternalAccounts(researcher.stripe_account_id!, {
        object: "bank_account",
        limit: 10,
      });

      for (const acct of accounts.data) {
        const bankAccount = acct as Stripe.BankAccount;
        if (!bankAccount.fingerprint) continue;

        const existing = fingerprintMap.get(bankAccount.fingerprint) ?? [];
        existing.push(researcher.id);
        fingerprintMap.set(bankAccount.fingerprint, existing);
      }
    } catch (err) {
      console.error(`[Fraud Scan] Failed to list external accounts for ${researcher.id}:`, err);
    }
  }

  let flagged = 0;
  for (const [fingerprint, researcherIds] of fingerprintMap.entries()) {
    if (researcherIds.length < 2) continue;

    for (const researcherId of researcherIds) {
      const { data: existingFlag } = await supabase
        .from("payout_fraud_flags")
        .select("id")
        .eq("researcher_id", researcherId)
        .eq("flag_type", "duplicate_bank_account")
        .eq("resolved", false)
        .contains("detail", { fingerprint })
        .maybeSingle();

      if (existingFlag) continue;

      await supabase.from("payout_fraud_flags").insert({
        researcher_id: researcherId,
        flag_type: "duplicate_bank_account",
        detail: {
          fingerprint,
          shared_with: researcherIds.filter((id) => id !== researcherId),
        },
      });
      flagged++;
    }
  }

  return { flagged };
}

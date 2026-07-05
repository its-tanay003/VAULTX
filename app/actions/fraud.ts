"use server";

import { createClient } from "@/lib/supabase/server";
import { scanForDuplicateBankAccounts } from "@/lib/stripe/fraud";
import { revalidatePath } from "next/cache";

async function assertAdminOrOrgOwner() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const { data: ownsOrg } = await supabase.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();

  if (profile?.role !== "admin" && !ownsOrg) {
    throw new Error("Only an admin or organization owner can run fraud scans");
  }
  return user.id;
}

export async function runFraudScan(): Promise<{ flagged: number }> {
  await assertAdminOrOrgOwner();
  const result = await scanForDuplicateBankAccounts();
  revalidatePath("/dashboard/org/payouts");
  return result;
}

export async function resolveFraudFlag(flagId: string): Promise<void> {
  const userId = await assertAdminOrOrgOwner();
  const supabase = createClient();
  const { error } = await supabase
    .from("payout_fraud_flags")
    .update({ resolved: true, resolved_by: userId, resolved_at: new Date().toISOString() })
    .eq("id", flagId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/org/payouts");
}

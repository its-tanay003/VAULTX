"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getOwnedOrgId(): Promise<{ userId: string; orgId: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  return { userId: user.id, orgId: org?.id ?? null };
}

export interface GithubInstallationStatus {
  connected:            boolean;
  accountLogin?:        string;
  accountType?:         string;
  repositorySelection?: string;
}

/** Reads the current org's GitHub App installation, if any. */
export async function getGithubInstallationStatus(): Promise<GithubInstallationStatus> {
  const { orgId } = await getOwnedOrgId();
  if (!orgId) return { connected: false };

  const supabase = createClient();
  const { data } = await supabase
    .from("github_installations")
    .select("account_login, account_type, repository_selection")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!data) return { connected: false };
  return {
    connected: true,
    accountLogin: data.account_login,
    accountType: data.account_type,
    repositorySelection: data.repository_selection,
  };
}

/** Removes the org's GitHub App installation record. Does not uninstall the App on GitHub's side — that's done from GitHub's own settings — this just stops VAULTX from using it. */
export async function disconnectGithubApp(): Promise<void> {
  const { orgId } = await getOwnedOrgId();
  if (!orgId) throw new Error("Only an organization owner can manage the GitHub App connection");

  const supabase = createClient();
  const { error } = await supabase.from("github_installations").delete().eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings/integrations");
}

"use server";

import { createClient }   from "@/lib/supabase/server";
import { revalidatePath }  from "next/cache";
import { redirect }        from "next/navigation";
import crypto              from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiKey {
  id:           string;
  name:         string;
  prefix:       string;   // first 8 chars shown to user
  hash:         string;   // sha-256 of full key (stored)
  scopes:       string[];
  created_at:   string;
  last_used_at: string | null;
}

export interface ActiveSession {
  id:         string;
  device:     string;
  ip:         string;
  user_agent: string;
  last_seen:  string;
  is_current: boolean;
}

export interface UserSettingsData {
  theme:                    string;
  language:                 string;
  timezone:                 string;
  two_fa_enabled:           boolean;
  data_visibility:          "public" | "org_only" | "private";
  hide_from_leaderboard:    boolean;
  show_activity:            boolean;
  marketing_emails:         boolean;
  security_alerts:          boolean;
  weekly_digest:            boolean;
  slack_webhook_url:        string | null;
  jira_url:                 string | null;
  jira_token:               string | null;
  slack_webhook:            string | null;
  github_token:             string | null;
  api_keys:                 ApiKey[];
  active_sessions:          ActiveSession[];
  linked_accounts:          Record<string, unknown>;
}

export interface OrgSettingsData {
  require_2fa:              boolean;
  sso_enabled:              boolean;
  sso_provider:             string | null;
  allowed_domains:          string[];
  webhook_url:              string | null;
  webhook_secret:           string | null;
  webhook_events:           string[];
  slack_webhook:            string | null;
  jira_url:                 string | null;
  jira_token:               string | null;
  jira_project_key:         string | null;
  default_payout_currency:  string;
  minimum_payout:           number;
  plan:                     string;
  seats_used:               number;
  seats_limit:              number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthedUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// ─── User Settings ────────────────────────────────────────────────────────────

export async function getUserSettings(): Promise<UserSettingsData> {
  const { supabase, user } = await getAuthedUser();

  // Upsert to ensure row exists
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true })
    .select()
    .single();

  if (error) {
    // Row already exists — just select
    const { data: existing, error: fetchErr } = await supabase
      .from("user_settings")
      .select("*")
      .eq("id", user.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    return existing as UserSettingsData;
  }

  return data as UserSettingsData;
}

export async function updateUserSettings(updates: Partial<UserSettingsData>) {
  const { supabase, user } = await getAuthedUser();

  const { error } = await supabase
    .from("user_settings")
    .upsert({ id: user.id, ...updates }, { onConflict: "id" });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

// ─── Org Settings ─────────────────────────────────────────────────────────────

export async function getOrgSettings(orgId: string): Promise<OrgSettingsData> {
  const { supabase } = await getAuthedUser();

  const { data, error } = await supabase
    .from("org_settings")
    .upsert({ org_id: orgId }, { onConflict: "org_id", ignoreDuplicates: true })
    .select()
    .single();

  if (error) {
    const { data: existing, error: fetchErr } = await supabase
      .from("org_settings")
      .select("*")
      .eq("org_id", orgId)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    return existing as OrgSettingsData;
  }

  return data as OrgSettingsData;
}

export async function updateOrgSettings(orgId: string, updates: Partial<OrgSettingsData>) {
  const { supabase } = await getAuthedUser();

  const { error } = await supabase
    .from("org_settings")
    .upsert({ org_id: orgId, ...updates }, { onConflict: "org_id" });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings/organization");
}

// ─── Org Profile (organizations table) ───────────────────────────────────────

export async function updateOrgProfile(formData: FormData) {
  const { supabase, user } = await getAuthedUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id || !["org", "admin"].includes(profile.role)) {
    throw new Error("Unauthorized");
  }

  const updates: Record<string, string> = {};
  for (const key of ["name", "slug", "website", "description", "industry"]) {
    const val = formData.get(key);
    if (val !== null) updates[key] = String(val);
  }

  const { error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", profile.org_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings/organization");
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export async function generateApiKey(name: string, scopes: string[]): Promise<string> {
  const { supabase, user } = await getAuthedUser();

  const rawKey  = `vx_${crypto.randomBytes(32).toString("hex")}`;
  const prefix  = rawKey.slice(0, 11); // "vx_" + 8 hex chars
  const keyHash = sha256(rawKey);
  const keyId   = crypto.randomUUID();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("api_keys")
    .eq("id", user.id)
    .single();

  const existing: ApiKey[] = (settings?.api_keys as ApiKey[]) ?? [];

  if (existing.length >= 10) throw new Error("Maximum 10 API keys allowed.");

  const newKey: ApiKey = {
    id:           keyId,
    name,
    prefix,
    hash:         keyHash,
    scopes,
    created_at:   new Date().toISOString(),
    last_used_at: null,
  };

  const { error } = await supabase
    .from("user_settings")
    .upsert({ id: user.id, api_keys: [...existing, newKey] }, { onConflict: "id" });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings/api-keys");

  return rawKey; // returned ONCE to the caller
}

export async function revokeApiKey(keyId: string) {
  const { supabase, user } = await getAuthedUser();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("api_keys")
    .eq("id", user.id)
    .single();

  const filtered = ((settings?.api_keys as ApiKey[]) ?? []).filter((k) => k.id !== keyId);

  const { error } = await supabase
    .from("user_settings")
    .update({ api_keys: filtered })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings/api-keys");
}

// ─── Password Change ──────────────────────────────────────────────────────────

export async function changePassword(formData: FormData) {
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPw   = String(formData.get("confirm_password") ?? "");

  if (newPassword.length < 8)     throw new Error("Password must be at least 8 characters.");
  if (newPassword !== confirmPw)  throw new Error("Passwords do not match.");

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);

  // Record timestamp in user_settings
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("user_settings")
      .upsert({ id: user.id, last_password_changed_at: new Date().toISOString() }, { onConflict: "id" });
  }

  revalidatePath("/dashboard/settings/security");
}

// ─── Account Deletion ─────────────────────────────────────────────────────────

export async function requestAccountDeletion() {
  const { supabase, user } = await getAuthedUser();

  // Soft delete: mark profile as deleted. Hard deletion handled by a cron/edge function.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name:  "[Deleted User]",
      username:   null,
      bio:        null,
      website:    null,
      twitter:    null,
      github:     null,
      avatar_url: null,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  // Sign out
  await supabase.auth.signOut();
  redirect("/");
}

// ─── Data Export ──────────────────────────────────────────────────────────────

export async function requestDataExport(): Promise<{ message: string }> {
  // In production: enqueue a background job that assembles a JSON/ZIP and emails it.
  // For now, return a confirmation message.
  return { message: "Your data export has been queued. You will receive an email within 24 hours." };
}

// ─── Team Management ─────────────────────────────────────────────────────────

export async function inviteTeamMember(formData: FormData) {
  const { supabase, user } = await getAuthedUser();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();

  if (!email.includes("@")) throw new Error("Invalid email address.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id || !["org", "admin"].includes(profile.role)) {
    throw new Error("Only organization owners can invite members.");
  }

  // In production: send invite email via Resend. For now, log intent.
  console.info(`[Team Invite] org=${profile.org_id} invited=${email} by=${user.id}`);

  revalidatePath("/dashboard/settings/organization");
  return { message: `Invitation sent to ${email}` };
}

export async function removeTeamMember(memberId: string) {
  const { supabase, user } = await getAuthedUser();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!myProfile?.org_id || !["org", "admin"].includes(myProfile.role)) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ org_id: null, role: "researcher" })
    .eq("id", memberId)
    .eq("org_id", myProfile.org_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings/organization");
}

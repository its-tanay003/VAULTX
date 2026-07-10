"use server";

import { createClient } from "@/lib/supabase/server";

export async function listVaultConversations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data } = await supabase
    .from("vault_conversations").select("id, title, updated_at")
    .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(30);
  return data ?? [];
}

export async function loadVaultConversation(conversationId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data } = await supabase
    .from("vault_messages").select("role, content, created_at")
    .eq("conversation_id", conversationId).order("created_at", { ascending: true });
  return data ?? [];
}

export async function deleteVaultConversation(conversationId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await supabase.from("vault_conversations").delete().eq("id", conversationId).eq("user_id", user.id);
}

/** Marks a proposed VAULT action as cancelled — used by the Action Preview card's Cancel button. */
export async function cancelVaultAction(actionId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await supabase.from("vault_actions").update({ status: "cancelled" }).eq("id", actionId).eq("user_id", user.id).eq("status", "proposed");
}

/** Reads the current user's Agent Mode toggle + consent status, for the settings UI. */
export async function getVaultAgentModeStatus(): Promise<{ enabled: boolean; consentGiven: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data } = await supabase
    .from("profiles").select("vault_agent_mode_enabled, vault_agent_consent_at").eq("id", user.id).single();

  return {
    enabled: data?.vault_agent_mode_enabled ?? true,
    consentGiven: !!data?.vault_agent_consent_at,
  };
}

/** Enables/disables Agent Mode for the current user — a durable, per-user setting per the design doc §9, not a recurring dialog. */
export async function setVaultAgentModeEnabled(enabled: boolean): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await supabase.from("profiles").update({ vault_agent_mode_enabled: enabled }).eq("id", user.id);
}

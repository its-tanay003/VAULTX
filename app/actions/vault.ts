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

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface ActiveSession {
  id: string;
  device: string;
  ip: string;
  user_agent: string;
  last_seen: string;
  is_current: boolean;
}

async function getAuthedUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

/**
 * Lists the active sessions of the authenticated user.
 */
export async function listActiveSessions(): Promise<ActiveSession[]> {
  const { supabase, user } = await getAuthedUser();

  // Get the current active session from Supabase client context
  const { data: { session: currentSession } } = await supabase.auth.getSession();

  let currentSessionId = "";
  if (currentSession?.access_token) {
    try {
      const payloadPart = currentSession.access_token.split(".")[1];
      if (payloadPart) {
        const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString());
        currentSessionId = payload.sid || "";
      }
    } catch (e) {
      console.error("Failed to decode session ID from JWT:", e);
    }
  }

  // Fetch replicated sessions from the public.active_sessions table
  const { data: dbSessions, error } = await supabase
    .from("active_sessions")
    .select("id, ip, user_agent, last_active_at, created_at")
    .eq("user_id", user.id)
    .order("last_active_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch active sessions:", error);
    return [];
  }

  return (dbSessions ?? []).map((s) => ({
    id: s.id,
    device: s.user_agent ? parseDevice(s.user_agent) : "Unknown Device",
    ip: s.ip,
    user_agent: s.user_agent || "",
    last_seen: s.last_active_at,
    is_current: s.id === currentSessionId,
  }));
}

/**
 * Revokes an active session by session ID.
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const { supabase } = await getAuthedUser();

  // Call the Security Definer database function via RPC to delete the session from auth.sessions.
  // The trigger on auth.sessions will automatically propagate the deletion to public.active_sessions.
  const { error } = await supabase.rpc("revoke_user_session", { session_id: sessionId });

  if (error) {
    console.error("Failed to revoke session:", error);
    throw new Error(error.message || "Failed to revoke session");
  }

  revalidatePath("/dashboard/settings/security");
}

function parseDevice(userAgent: string): string {
  if (/iphone/i.test(userAgent)) return "iPhone";
  if (/ipad/i.test(userAgent)) return "iPad";
  if (/android/i.test(userAgent)) return "Android";
  if (/windows/i.test(userAgent)) return "Windows Desktop";
  if (/macintosh/i.test(userAgent)) return "macOS Desktop";
  if (/linux/i.test(userAgent)) return "Linux Desktop";
  return "Unknown Device";
}

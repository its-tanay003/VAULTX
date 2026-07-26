import { createClient } from "@/lib/supabase/server";
import { User, SupabaseClient } from "@supabase/supabase-js";

export interface AuthedContext {
  supabase: SupabaseClient;
  user: User;
}

export async function getAuthedUser(): Promise<AuthedContext> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

"use server";

import { createClient } from "@/lib/supabase/server";

export async function joinWaitlist(feature: "ptaas" | "ai_red_team"): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("feature_waitlist")
    .upsert(
      { user_id: user.id, feature },
      { onConflict: "user_id,feature", ignoreDuplicates: true }
    );

  if (error) throw new Error(error.message);
}

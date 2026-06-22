"use server";

import { createClient }   from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const fullName = (formData.get("full_name") as string)?.trim();
  const username = (formData.get("username")  as string)?.trim().toLowerCase();
  const bio       = (formData.get("bio")       as string)?.trim();
  const website   = (formData.get("website")   as string)?.trim();
  const twitter   = (formData.get("twitter")   as string)?.trim();
  const github    = (formData.get("github")    as string)?.trim();

  if (username && !/^[a-z0-9_-]{3,30}$/.test(username)) {
    throw new Error("Username must be 3-30 chars: letters, numbers, _ or -");
  }

  if (username) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();
    if (existing) throw new Error("Username already taken");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      username:  username || null,
      bio:       bio || null,
      website:   website || null,
      twitter:   twitter || null,
      github:    github || null,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard");
}

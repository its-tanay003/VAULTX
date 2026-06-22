"use server";

import { createClient }   from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markNotificationsRead(userId?: string, ids?: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const targetId = userId ?? user.id;
  if (targetId !== user.id) return; // can only mark own notifications

  let q = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", targetId);

  if (ids?.length) q = q.in("id", ids);
  else             q = q.eq("is_read", false);

  await q;
  revalidatePath("/dashboard/notifications");
}

export async function deleteNotification(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // RLS + explicit check

  revalidatePath("/dashboard/notifications");
}

export async function updateNotificationPreferences(prefs: {
  app_submission_new?:      boolean;
  app_submission_update?:   boolean;
  app_reward_update?:       boolean;
  email_submission_new?:    boolean;
  email_submission_update?: boolean;
  email_reward_update?:     boolean;
  email_digest_weekly?:     boolean;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() });

  revalidatePath("/dashboard/settings/notifications");
}

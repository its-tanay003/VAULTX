"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSchedule(templateId: string, frequency: "weekly" | "monthly", emails: string[]): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("scheduled_reports").insert({
    template_id: templateId, frequency, recipient_emails: emails, created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/org/reports");
}

export async function listSchedulesForTemplate(templateId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("scheduled_reports").select("id, frequency, recipient_emails, last_sent_at").eq("template_id", templateId);
  return data ?? [];
}

export async function deleteSchedule(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scheduled_reports").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/org/reports");
}

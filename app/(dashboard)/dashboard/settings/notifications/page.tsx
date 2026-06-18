import { createClient } from "@/lib/supabase/server";
import { redirect }      from "next/navigation";
import Link              from "next/link";
import { ChevronLeft }   from "lucide-react";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notification Settings" };

export default async function NotificationSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const defaults = {
    app_submission_new:      prefs?.app_submission_new      ?? true,
    app_submission_update:   prefs?.app_submission_update   ?? true,
    app_reward_update:       prefs?.app_reward_update       ?? true,
    email_submission_new:    prefs?.email_submission_new    ?? true,
    email_submission_update: prefs?.email_submission_update ?? true,
    email_reward_update:     prefs?.email_reward_update     ?? true,
    email_digest_weekly:     prefs?.email_digest_weekly     ?? false,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Notification Settings</h1>
          <p className="text-sm text-vault-muted">Choose what you want to be notified about</p>
        </div>
      </div>

      <NotificationPreferencesForm initialPrefs={defaults} />
    </div>
  );
}

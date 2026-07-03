"use client";

import { useState, useTransition } from "react";
import { toast }               from "sonner";
import { Loader2, Save }       from "lucide-react";
import { updateUserSettings }  from "@/app/actions/settings";
import { SectionCard, FieldRow, SettingsToggle } from "@/components/settings/section-card";
import { PushNotificationToggle } from "@/components/notifications/push-toggle";

export default function NotificationsSettingsPage() {
  const [pending, start] = useTransition();

  const [securityAlerts, setSecurityAlerts]   = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [weeklyDigest, setWeeklyDigest]       = useState(false);
  const [slackWebhook, setSlackWebhook] = useState("");

  function handleSave() {
    start(async () => {
      try {
        await updateUserSettings({
          security_alerts:   securityAlerts,
          marketing_emails:  marketingEmails,
          weekly_digest:     weeklyDigest,
          slack_webhook_url: slackWebhook || null,
        });
        toast.success("Notification preferences saved");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-5 animate-in">
      <SectionCard title="Email Notifications" description="Control which emails VaultX sends you">
        <div className="space-y-0">
          <FieldRow label="Security alerts" description="Login from new device, password changes">
            <SettingsToggle checked={securityAlerts} onChange={setSecurityAlerts} />
          </FieldRow>
          <FieldRow label="Weekly digest" description="Summary of your activity and earnings">
            <SettingsToggle checked={weeklyDigest} onChange={setWeeklyDigest} />
          </FieldRow>
          <FieldRow label="Marketing & announcements" description="Product updates, new features, events">
            <SettingsToggle checked={marketingEmails} onChange={setMarketingEmails} />
          </FieldRow>
        </div>
      </SectionCard>

      <SectionCard
        title="Push Notifications"
        description="Native browser/OS alerts, even when VAULTX isn't open in a tab"
      >
        <FieldRow
          label="Push notifications"
          description="Submission updates, reward approvals, and program changes"
        >
          <PushNotificationToggle />
        </FieldRow>
        <p className="text-[11px] text-vault-muted mt-3">
          In-app alerts (the bell icon in the dashboard) are always on and
          don't require this toggle — this controls native OS notifications
          only.
        </p>
      </SectionCard>

      <SectionCard title="Slack Notifications" description="Forward alerts to a personal Slack channel">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">Incoming Webhook URL</label>
            <input
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="vault-input w-full font-mono text-xs"
            />
            <p className="text-[10px] text-vault-muted mt-1">
              Create one at{" "}
              <a href="https://api.slack.com/incoming-webhooks" target="_blank" rel="noopener noreferrer" className="text-vault-teal hover:underline">
                api.slack.com/incoming-webhooks
              </a>
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={pending} className="btn-teal flex items-center gap-2 disabled:opacity-40">
          {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save preferences</>}
        </button>
      </div>
    </div>
  );
}

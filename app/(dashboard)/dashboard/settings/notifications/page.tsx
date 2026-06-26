"use client";

import { useState, useTransition } from "react";
import { toast }               from "sonner";
import { Loader2, Save }       from "lucide-react";
import { updateUserSettings }  from "@/app/actions/settings";
import { SectionCard, FieldRow, SettingsToggle } from "@/components/settings/section-card";

export default function NotificationsSettingsPage() {
  const [pending, start] = useTransition();

  const [securityAlerts, setSecurityAlerts]   = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [weeklyDigest, setWeeklyDigest]       = useState(false);
  const [submissionUpdates, setSubmissionUpdates] = useState(true);
  const [rewardAlerts, setRewardAlerts]           = useState(true);
  const [programChanges, setProgramChanges]       = useState(true);
  const [teamActivity, setTeamActivity]           = useState(false);
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

      <SectionCard title="In-App Notifications" description="Real-time alerts inside the dashboard">
        <div className="space-y-0">
          <FieldRow label="Submission status updates" description="When your report status changes">
            <SettingsToggle checked={submissionUpdates} onChange={setSubmissionUpdates} />
          </FieldRow>
          <FieldRow label="Reward payouts" description="When rewards are approved or paid">
            <SettingsToggle checked={rewardAlerts} onChange={setRewardAlerts} />
          </FieldRow>
          <FieldRow label="Program changes" description="New programs, scope changes, pauses">
            <SettingsToggle checked={programChanges} onChange={setProgramChanges} />
          </FieldRow>
          <FieldRow label="Team activity" description="New team members, org events">
            <SettingsToggle checked={teamActivity} onChange={setTeamActivity} />
          </FieldRow>
        </div>
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

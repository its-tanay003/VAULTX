"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreferences } from "@/app/actions/notifications";
import { toast }  from "sonner";
import { Bell, Mail, Loader2, Save } from "lucide-react";
import { cn }     from "@/lib/utils";

interface Prefs {
  app_submission_new:      boolean;
  app_submission_update:   boolean;
  app_reward_update:       boolean;
  email_submission_new:    boolean;
  email_submission_update: boolean;
  email_reward_update:     boolean;
  email_digest_weekly:     boolean;
}

interface Props { initialPrefs: Prefs }

export function NotificationPreferencesForm({ initialPrefs }: Props) {
  const [prefs,   setPrefs]   = useState<Prefs>(initialPrefs);
  const [pending, start]      = useTransition();

  function toggle(key: keyof Prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  function save() {
    start(async () => {
      try {
        await updateNotificationPreferences(prefs);
        toast.success("Preferences saved");
      } catch {
        toast.error("Failed to save preferences");
      }
    });
  }

  return (
    <div className="max-w-lg space-y-6">
      <PrefsSection
        icon={<Bell className="w-4 h-4 text-vault-teal" />}
        title="In-app notifications"
        description="Shown in the notification bell in the header"
      >
        <PrefToggle
          label="New submission received"
          description="When a researcher submits a report to your program"
          checked={prefs.app_submission_new}
          onChange={() => toggle("app_submission_new")}
        />
        <PrefToggle
          label="Submission status updates"
          description="When your report is accepted, rejected, or needs info"
          checked={prefs.app_submission_update}
          onChange={() => toggle("app_submission_update")}
        />
        <PrefToggle
          label="Reward updates"
          description="When a reward is approved or paid"
          checked={prefs.app_reward_update}
          onChange={() => toggle("app_reward_update")}
        />
      </PrefsSection>

      <PrefsSection
        icon={<Mail className="w-4 h-4 text-vault-teal" />}
        title="Email notifications"
        description="Sent to your account email address"
      >
        <PrefToggle
          label="New submission received"
          description="Email when a researcher submits to your program"
          checked={prefs.email_submission_new}
          onChange={() => toggle("email_submission_new")}
        />
        <PrefToggle
          label="Submission status updates"
          description="Email when your report status changes"
          checked={prefs.email_submission_update}
          onChange={() => toggle("email_submission_update")}
        />
        <PrefToggle
          label="Reward updates"
          description="Email when a reward is approved or paid"
          checked={prefs.email_reward_update}
          onChange={() => toggle("email_reward_update")}
        />
        <PrefToggle
          label="Weekly digest"
          description="Summary of program activity every Monday"
          checked={prefs.email_digest_weekly}
          onChange={() => toggle("email_digest_weekly")}
        />
      </PrefsSection>

      <button
        onClick={save}
        disabled={pending}
        className="btn-teal flex items-center gap-2 disabled:opacity-40"
      >
        {pending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          : <><Save className="w-4 h-4" /> Save preferences</>}
      </button>
    </div>
  );
}

function PrefsSection({
  icon, title, description, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="vault-card p-5">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-xs text-vault-muted mb-4">{description}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function PrefToggle({
  label, description, checked, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-vault-muted mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5",
          checked ? "bg-vault-teal" : "bg-vault-border"
        )}
        role="switch"
        aria-checked={checked}
      >
        <span className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )} />
      </button>
    </div>
  );
}

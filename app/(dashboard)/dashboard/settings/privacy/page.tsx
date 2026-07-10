"use client";

import { useState, useTransition } from "react";
import { toast }               from "sonner";
import { Loader2, Save, Download, Clock } from "lucide-react";
import { updateUserSettings, requestDataExport } from "@/app/actions/settings";
import { SectionCard, FieldRow, SettingsToggle } from "@/components/settings/section-card";
import { VaultAgentModeToggle } from "@/components/vault/vault-agent-mode-toggle";
import { cn } from "@/lib/utils";

type Visibility = "public" | "org_only" | "private";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; desc: string }[] = [
  { value: "public",   label: "Public",       desc: "Anyone can view your profile" },
  { value: "org_only", label: "Organizations", desc: "Only orgs you work with" },
  { value: "private",  label: "Private",       desc: "Only you can see your profile" },
];

const MOCK_LOGINS = [
  { id: "1", ip: "212.56.41.9",  device: "Chrome / Windows",  time: new Date(Date.now() - 1000 * 60 * 5).toISOString()  },
  { id: "2", ip: "212.56.41.9",  device: "Chrome / Windows",  time: new Date(Date.now() - 1000 * 3600 * 2).toISOString() },
  { id: "3", ip: "91.108.4.101", device: "Mobile / Android",  time: new Date(Date.now() - 1000 * 3600 * 26).toISOString() },
  { id: "4", ip: "212.56.41.9",  device: "Firefox / macOS",   time: new Date(Date.now() - 1000 * 3600 * 48).toISOString() },
];

export default function PrivacySettingsPage() {
  const [pending, start]         = useTransition();
  const [exportPending, startEx] = useTransition();
  const [visibility, setVisibility]         = useState<Visibility>("public");
  const [hideLeaderboard, setHideLeaderboard] = useState(false);
  const [showActivity, setShowActivity]       = useState(true);

  function handleSave() {
    start(async () => {
      try {
        await updateUserSettings({
          data_visibility:       visibility,
          hide_from_leaderboard: hideLeaderboard,
          show_activity:         showActivity,
        });
        toast.success("Privacy settings saved");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleExport() {
    startEx(async () => {
      try {
        const result = await requestDataExport();
        toast.success(result.message);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Export failed");
      }
    });
  }

  return (
    <div className="space-y-5 animate-in">
      {/* VAULT Agent Mode */}
      <SectionCard title="AI Assistant" description="Control what VAULT is allowed to do on your behalf">
        <VaultAgentModeToggle />
      </SectionCard>

      {/* Visibility */}
      <SectionCard title="Profile Visibility" description="Control who can see your public profile">
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setVisibility(opt.value)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                visibility === opt.value
                  ? "border-vault-teal/40 bg-vault-teal/5"
                  : "border-vault-border hover:border-vault-teal/20"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0",
                visibility === opt.value ? "border-vault-teal" : "border-vault-border"
              )}>
                {visibility === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-vault-teal" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-vault-muted">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Activity */}
      <SectionCard title="Activity & Discovery" description="Control how your activity appears to others">
        <div>
          <FieldRow label="Hide from leaderboard" description="Your username won't appear in public rankings">
            <SettingsToggle checked={hideLeaderboard} onChange={setHideLeaderboard} />
          </FieldRow>
          <FieldRow label="Show recent activity" description="Display your recent submission activity on your profile">
            <SettingsToggle checked={showActivity} onChange={setShowActivity} />
          </FieldRow>
        </div>
      </SectionCard>

      {/* Login history */}
      <SectionCard title="Login History" description="Recent sign-ins to your account (last 30 days)">
        <div className="divide-y divide-vault-border/50">
          {MOCK_LOGINS.map((login) => (
            <div key={login.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Clock className="w-3.5 h-3.5 text-vault-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{login.device}</p>
                <p className="text-[10px] text-vault-muted">{login.ip}</p>
              </div>
              <p className="text-[10px] text-vault-muted shrink-0">
                {new Date(login.time).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Data export */}
      <SectionCard title="Your Data" description="Download a copy of all your data stored on VaultX">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Request data export</p>
            <p className="text-xs text-vault-muted">You&apos;ll receive a ZIP via email within 24 hours.</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exportPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-vault-border hover:bg-vault-elevated/50 transition-colors disabled:opacity-40"
          >
            {exportPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            Export
          </button>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={pending} className="btn-teal flex items-center gap-2 disabled:opacity-40">
          {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save settings</>}
        </button>
      </div>
    </div>
  );
}

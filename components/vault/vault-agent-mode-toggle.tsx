"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { getVaultAgentModeStatus, setVaultAgentModeEnabled } from "@/app/actions/vault";
import { SettingsToggle } from "@/components/settings/section-card";

export function VaultAgentModeToggle() {
  const [enabled, setEnabled] = useState(true);
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getVaultAgentModeStatus()
      .then((status) => { setEnabled(status.enabled); setConsentGiven(status.consentGiven); })
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(next: boolean) {
    setPending(true);
    try {
      await setVaultAgentModeEnabled(next);
      setEnabled(next);
      toast.success(next ? "VAULT Agent Mode enabled" : "VAULT Agent Mode disabled — VAULT will only chat, never propose actions");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-vault-teal mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">VAULT Agent Mode</p>
          <p className="text-xs text-vault-muted mt-0.5 max-w-md">
            Lets VAULT propose actions (like triggering a scan or generating a report) that you
            explicitly confirm before anything executes. Every confirmed action is logged and
            attributed to you. Turning this off leaves VAULT&apos;s chat fully working — it just
            won&apos;t ever propose doing something for you.
          </p>
          {consentGiven && (
            <p className="text-[11px] text-vault-muted mt-1">You&apos;ve previously confirmed at least one VAULT action.</p>
          )}
        </div>
      </div>
      {loading ? <Loader2 className="w-4 h-4 animate-spin text-vault-muted shrink-0" /> : (
        <div className="shrink-0">
          <SettingsToggle checked={enabled} onChange={handleToggle} disabled={pending} />
        </div>
      )}
    </div>
  );
}

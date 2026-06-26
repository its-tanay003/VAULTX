"use client";

import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface IntegrationTileProps {
  icon:          React.ReactNode;
  name:          string;
  description:   string;
  connected:     boolean;
  connectedInfo?: string;  // e.g. "@username" or "org/repo"
  onConnect?:    () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  configSlot?:   React.ReactNode;  // extra form fields when connecting
  docsUrl?:      string;
}

export function IntegrationTile({
  icon,
  name,
  description,
  connected,
  connectedInfo,
  onConnect,
  onDisconnect,
  configSlot,
  docsUrl,
}: IntegrationTileProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [pending, start]            = useTransition();

  function handlePrimary() {
    if (connected) {
      if (!onDisconnect) return;
      start(async () => {
        try {
          await onDisconnect();
          toast.success(`${name} disconnected`);
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed");
        }
      });
    } else if (configSlot) {
      setShowConfig((v) => !v);
    } else if (onConnect) {
      start(async () => {
        try {
          await onConnect();
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed");
        }
      });
    }
  }

  return (
    <div className="py-4 border-b border-vault-border/50 last:border-0 last:pb-0 first:pt-0">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-vault-elevated border border-vault-border flex items-center justify-center shrink-0 text-vault-muted">
          {icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{name}</p>
            {connected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-vault-muted/40" />
            )}
          </div>
          <p className="text-xs text-vault-muted">
            {connected && connectedInfo ? connectedInfo : description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-vault-muted hover:text-vault-text transition-colors"
              title="Documentation"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={handlePrimary}
            disabled={pending}
            className={cn(
              "px-3 py-1.5 text-xs rounded-lg font-medium transition-colors disabled:opacity-40 flex items-center gap-1",
              connected
                ? "border border-vault-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                : "bg-vault-teal/10 border border-vault-teal/30 text-vault-teal hover:bg-vault-teal/20"
            )}
          >
            {pending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : connected ? "Disconnect" : configSlot ? (showConfig ? "Cancel" : "Configure") : "Connect"}
          </button>
        </div>
      </div>

      {/* Config slot */}
      {showConfig && configSlot && (
        <div className="mt-3 ml-12 space-y-3">
          {configSlot}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DangerConfirmDialogProps {
  open:          boolean;
  onClose:       () => void;
  title:         string;
  description:   string;
  confirmWord:   string;  // user must type this exact string
  actionLabel:   string;
  onConfirm:     () => Promise<void>;
}

export function DangerConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmWord,
  actionLabel,
  onConfirm,
}: DangerConfirmDialogProps) {
  const [typed, setTyped]     = useState("");
  const [pending, start]      = useTransition();

  if (!open) return null;

  const canProceed = typed === confirmWord;

  function handleConfirm() {
    start(async () => {
      try {
        await onConfirm();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md vault-card border-red-500/30 p-6 space-y-4 animate-in">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-red-400">{title}</h2>
            <p className="text-xs text-vault-muted mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-vault-muted">
            Type <span className="font-mono font-bold text-red-400">{confirmWord}</span> to confirm
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmWord}
            className="vault-input w-full font-mono"
            autoFocus
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={pending}
            className="flex-1 px-4 py-2 text-sm rounded-lg border border-vault-border hover:bg-vault-elevated/50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canProceed || pending}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {pending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
              : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

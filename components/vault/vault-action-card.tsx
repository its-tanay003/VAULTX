"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { cancelVaultAction } from "@/app/actions/vault";

export interface ProposedAction {
  id: string;
  type: string;
  params: Record<string, string>;
  summary: string;
}

type CardState = "pending" | "executing" | "succeeded" | "failed" | "cancelled";

/**
 * Deliberately distinct visual treatment from a normal chat bubble —
 * per the design doc §8, this must never be mistaken for VAULT just
 * talking. Nothing here executes until the user clicks Confirm.
 */
export function VaultActionCard({ action }: { action: ProposedAction }) {
  const [state, setState] = useState<CardState>("pending");
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function handleConfirm() {
    setState("executing");
    try {
      const res = await fetch("/api/vault/execute-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setState("succeeded");
        setResultMessage(
          typeof data.result?.message === "string" ? data.result.message
          : data.result?.downloadUrl ? "Report generated — download ready"
          : "Done"
        );
      } else {
        setState("failed");
        setResultMessage(data.error ?? "Execution failed");
      }
    } catch {
      setState("failed");
      setResultMessage("Network error — please try again");
    }
  }

  async function handleCancel() {
    setState("cancelled");
    await cancelVaultAction(action.id).catch(() => {});
  }

  return (
    <div className="border border-vault-teal/40 bg-vault-teal/5 rounded-xl p-3 space-y-2.5 max-w-[90%]">
      <div className="flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-vault-teal shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-vault-teal font-medium mb-0.5">Proposed Action</p>
          <p className="text-xs text-vault-text leading-relaxed">{action.summary}</p>
        </div>
      </div>

      {state === "pending" && (
        <div className="flex gap-2 pt-1">
          <button onClick={handleConfirm} className="btn-teal text-xs flex-1 py-1.5">Confirm</button>
          <button onClick={handleCancel} className="btn-ghost text-xs flex items-center justify-center gap-1 px-3">
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      )}

      {state === "executing" && (
        <div className="flex items-center gap-2 text-xs text-vault-muted pt-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Executing…
        </div>
      )}

      {state === "succeeded" && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {resultMessage}
        </div>
      )}

      {state === "failed" && (
        <div className="flex items-center gap-2 text-xs text-red-400 pt-1">
          <XCircle className="w-3.5 h-3.5" /> {resultMessage}
        </div>
      )}

      {state === "cancelled" && (
        <p className="text-xs text-vault-muted pt-1">Cancelled — nothing was executed.</p>
      )}
    </div>
  );
}

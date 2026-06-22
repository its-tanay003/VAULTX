"use client";

import { useTransition } from "react";
import { runWeb3Audit }  from "@/app/actions/code-quality";
import { toast }         from "sonner";
import { Shield, Loader2 } from "lucide-react";

export function Web3AuditButton({
  repoId,
  isRunning,
}: {
  repoId:    string;
  isRunning: boolean;
}) {
  const [pending, start] = useTransition();
  const busy = pending || isRunning;

  function handleAudit() {
    start(async () => {
      try {
        await runWeb3Audit(repoId);
        toast.success("Smart contract audit complete");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Audit failed");
      }
    });
  }

  return (
    <button
      onClick={handleAudit}
      disabled={busy}
      className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all
        text-teal-400 border-teal-900/50 bg-teal-950/30 hover:bg-teal-950/50 disabled:opacity-50"
    >
      {busy
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Auditing…</>
        : <><Shield className="w-3.5 h-3.5" /> Web3 Audit</>}
    </button>
  );
}

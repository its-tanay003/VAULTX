"use client";

import { useTransition } from "react";
import { triggerScan } from "@/app/actions/red-team";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";

export function RunScanButton({ targetId, isRunning }: { targetId: string; isRunning: boolean }) {
  const [pending, start] = useTransition();
  const busy = pending || isRunning;

  function handleRun() {
    start(async () => {
      try {
        const res = await triggerScan(targetId);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Scan complete");
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Scan failed");
      }
    });
  }

  return (
    <button
      onClick={handleRun}
      disabled={busy}
      className="btn-teal flex items-center gap-2 text-sm disabled:opacity-50"
    >
      {busy
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning…</>
        : <><Zap className="w-3.5 h-3.5" /> Run Scan</>}
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { runScan }       from "@/app/actions/code-quality";
import { toast }         from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";

export function RescanButton({ repoId, isScanning }: { repoId: string; isScanning: boolean }) {
  const [pending, start] = useTransition();
  const busy = pending || isScanning;

  function handleRescan() {
    start(async () => {
      try {
        await runScan(repoId);
        toast.success("Scan complete");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Scan failed");
      }
    });
  }

  return (
    <button
      onClick={handleRescan}
      disabled={busy}
      className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50"
    >
      {busy
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning…</>
        : <><RotateCcw className="w-3.5 h-3.5" /> Re-scan</>}
    </button>
  );
}

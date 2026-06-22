"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Scoped to the dashboard route group. Unlike global-error.tsx, this
 * preserves the sidebar and header — only the content area shows the
 * error state, so navigation remains available.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VAULTX Dashboard Error]", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center py-20 text-center animate-in">
      <div className="w-14 h-14 rounded-2xl bg-red-950/50 border border-red-900/50 flex items-center justify-center mb-5">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <h2 className="text-lg font-semibold mb-2">This page hit an error</h2>
      <p className="text-sm text-vault-muted leading-relaxed mb-6">
        Something went wrong loading this view. Your data is safe — try
        reloading this section.
      </p>
      <button onClick={reset} className="btn-teal flex items-center gap-2">
        <RotateCcw className="w-4 h-4" /> Reload section
      </button>
      {error.digest && (
        <p className="text-[11px] text-vault-muted font-mono mt-4">
          Error ref: {error.digest}
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

/**
 * Catches uncaught errors thrown by Server or Client Components within
 * the nearest route segment. Next.js convention — auto-wired, no extra
 * setup needed for routes inside app/.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, send to error tracking (Sentry, etc.) — out of scope for MVP
    console.error("[VAULTX Error Boundary]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-vault-bg text-vault-text min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-900/50 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>

          <p className="font-mono text-xs text-red-400 mb-3 tracking-widest">
            ERROR 500{error.digest ? ` · ${error.digest.slice(0, 8)}` : ""}
          </p>
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-vault-muted leading-relaxed mb-8">
            An unexpected error occurred. This has been logged. You can try
            again or return to your dashboard.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="btn-teal flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
            <Link href="/dashboard" className="btn-ghost flex items-center gap-2">
              <Home className="w-4 h-4" /> Dashboard
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

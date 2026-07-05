"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { runFraudScan, resolveFraudFlag } from "@/app/actions/fraud";

interface FraudFlag {
  id: string;
  researcher_id: string;
  flag_type: string;
  detail: Record<string, unknown>;
  created_at: string;
  researcherName: string;
}

export function FraudFlagsPanel({ flags }: { flags: FraudFlag[] }) {
  const [pending, start] = useTransition();

  function handleScan() {
    start(async () => {
      try {
        const result = await runFraudScan();
        toast[result.flagged > 0 ? "error" : "success"](
          result.flagged > 0 ? `Scan found ${result.flagged} new flag(s)` : "Scan complete — no duplicate bank accounts found"
        );
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Scan failed");
      }
    });
  }

  function handleResolve(flagId: string) {
    start(async () => {
      try {
        await resolveFraudFlag(flagId);
        toast.success("Flag resolved");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to resolve flag");
      }
    });
  }

  return (
    <div className="vault-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-medium">Fraud Flags</h3>
        </div>
        <button onClick={handleScan} disabled={pending} className="btn-ghost text-xs flex items-center gap-1.5">
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Run scan
        </button>
      </div>
      <p className="text-[11px] text-vault-muted">
        Scans for researchers whose connected Stripe accounts share the same bank account
        fingerprint — a real signal from Stripe, not a heuristic guess.
      </p>

      {flags.length === 0 ? (
        <p className="text-xs text-vault-muted py-2">No unresolved flags.</p>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div key={flag.id} className="flex items-center justify-between gap-3 bg-red-950/20 border border-red-900/30 rounded-lg p-3">
              <div>
                <p className="text-xs font-medium text-red-300">
                  {flag.researcherName} — duplicate bank account
                </p>
                <p className="text-[10px] text-vault-muted mt-0.5">Flagged {new Date(flag.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => handleResolve(flag.id)} disabled={pending} className="text-xs text-vault-muted hover:text-emerald-400 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

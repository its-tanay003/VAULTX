"use client";

import { useTransition } from "react";
import { updateContestStatus, finalizeContest } from "@/app/actions/contests";
import { toast } from "sonner";
import { Scale, Loader2 } from "lucide-react";

/* ─── Status dropdown ──────────────────────────────────────────────────────── */
export function ContestStatusControl({
  contestId, currentStatus,
}: {
  contestId:     string;
  currentStatus: string;
}) {
  const [pending, start] = useTransition();

  function handleChange(value: string) {
    start(async () => {
      try {
        await updateContestStatus(contestId, value as "draft" | "open" | "judging" | "complete" | "archived");
        toast.success(`Contest set to ${value}`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  return (
    <select
      value={currentStatus}
      onChange={(e) => handleChange(e.target.value)}
      disabled={pending || currentStatus === "complete"}
      className="vault-input text-xs py-1.5 w-auto disabled:opacity-50"
    >
      <option value="draft">Draft</option>
      <option value="open">Open</option>
      <option value="judging">Judging</option>
      <option value="complete">Complete</option>
      <option value="archived">Archived</option>
    </select>
  );
}

/* ─── Finalize / distribute pool button ────────────────────────────────────── */
export function FinalizeButton({
  contestId, disabled,
}: {
  contestId: string;
  disabled:  boolean;
}) {
  const [pending, start] = useTransition();

  function handleFinalize() {
    start(async () => {
      try {
        await finalizeContest(contestId);
        toast.success("Contest finalized — pool distribution calculated!");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to finalize contest");
      }
    });
  }

  return (
    <button
      onClick={handleFinalize}
      disabled={disabled || pending}
      className="btn-teal flex items-center gap-2 text-sm disabled:opacity-40"
      title={disabled ? "Judge all pending findings before finalizing" : "Calculate pool distribution"}
    >
      {pending
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculating…</>
        : <><Scale className="w-4 h-4" /> Finalize Distribution</>}
    </button>
  );
}

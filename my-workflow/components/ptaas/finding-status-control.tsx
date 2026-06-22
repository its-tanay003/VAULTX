"use client";

import { useState, useTransition } from "react";
import { updateFindingStatus } from "@/app/actions/ptaas";
import { toast } from "sonner";

const OPTIONS = [
  { value: "open",          label: "Open"          },
  { value: "fixed",         label: "Fixed"         },
  { value: "needs_retest",  label: "Needs Retest"  },
  { value: "closed",        label: "Closed"        },
  { value: "wont_fix",      label: "Won't Fix"     },
] as const;

export function FindingStatusControl({
  findingId, engagementId, currentStatus,
}: {
  findingId: string;
  engagementId: string;
  currentStatus: string;
}) {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");

  function commit(status: string, retestNotes?: string) {
    start(async () => {
      try {
        await updateFindingStatus(findingId, engagementId, status as any, retestNotes);
        toast.success("Finding updated");
        setAsking(false);
        setNote("");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to update finding");
      }
    });
  }

  function handleChange(value: string) {
    if (value === "needs_retest" || value === "closed") {
      setAsking(true);
      return;
    }
    commit(value);
  }

  if (asking) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Retest note…"
          className="vault-input text-xs py-1 px-2 w-32"
        />
        <button
          onClick={() => commit("needs_retest", note)}
          disabled={pending}
          className="text-[10px] px-2 py-1 bg-vault-teal/10 text-vault-teal border border-vault-teal/20 rounded"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <select
      value={currentStatus}
      onChange={(e) => handleChange(e.target.value)}
      disabled={pending}
      className="vault-input text-[10px] py-1 px-1.5 w-auto shrink-0 disabled:opacity-50"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

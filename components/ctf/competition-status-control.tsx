"use client";

import { useTransition } from "react";
import { updateCompetitionStatus } from "@/app/actions/ctf";
import { toast } from "sonner";

const OPTIONS = [
  { value: "draft",    label: "Draft"    },
  { value: "active",   label: "Active"   },
  { value: "ended",    label: "Ended"    },
  { value: "archived", label: "Archived" },
] as const;

export function CompetitionStatusControl({
  competitionId,
  currentStatus,
}: {
  competitionId: string;
  currentStatus: string;
}) {
  const [pending, start] = useTransition();

  function handleChange(value: string) {
    start(async () => {
      try {
        await updateCompetitionStatus(competitionId, value as "draft" | "active" | "ended" | "archived");
        toast.success(`Competition set to ${value}`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  return (
    <select
      value={currentStatus}
      onChange={(e) => handleChange(e.target.value)}
      disabled={pending}
      className="vault-input text-xs py-1.5 w-auto disabled:opacity-50"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

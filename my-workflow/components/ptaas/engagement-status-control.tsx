"use client";

import { useTransition } from "react";
import { updateEngagementStatus } from "@/app/actions/ptaas";
import { toast } from "sonner";

const OPTIONS = [
  { value: "scheduled",   label: "Scheduled"   },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed"   },
  { value: "cancelled",   label: "Cancelled"   },
] as const;

export function EngagementStatusControl({
  engagementId, currentStatus,
}: {
  engagementId: string;
  currentStatus: string;
}) {
  const [pending, start] = useTransition();

  function handleChange(value: string) {
    start(async () => {
      try {
        await updateEngagementStatus(engagementId, value as any);
        toast.success("Status updated");
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

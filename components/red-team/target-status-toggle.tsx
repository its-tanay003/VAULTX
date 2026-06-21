"use client";

import { useTransition } from "react";
import { toggleTargetActive } from "@/app/actions/red-team";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TargetStatusToggle({ targetId, isActive }: { targetId: string; isActive: boolean }) {
  const [pending, start] = useTransition();

  function handleToggle() {
    start(async () => {
      try {
        await toggleTargetActive(targetId, !isActive);
        toast.success(isActive ? "Target paused" : "Target resumed");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to update target");
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={cn(
        "btn-ghost text-sm disabled:opacity-50",
        isActive ? "" : "text-vault-muted"
      )}
      title={isActive ? "Pause scheduled scanning" : "Resume scheduled scanning"}
    >
      {isActive ? "Pause" : "Resume"}
    </button>
  );
}

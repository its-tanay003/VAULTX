"use client";

import { useTransition } from "react";
import { updateProgramStatus } from "@/app/actions/programs";
import { toast } from "sonner";
import { Play, Pause, Archive, ChevronDown, Loader2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface ProgramStatusControlProps {
  programId: string;
  currentStatus: "active" | "draft" | "paused" | "archived";
}

export function ProgramStatusControl({
  programId,
  currentStatus,
}: ProgramStatusControlProps) {
  const [isPending, startTransition] = useTransition();

  if (currentStatus === "archived") {
    return null;
  }

  const handleStatusChange = (status: "active" | "paused" | "archived") => {
    startTransition(async () => {
      try {
        await updateProgramStatus(programId, status);
        toast.success(`Program status updated to ${status}`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  };

  const statusConfig = {
    draft: {
      label: "Draft",
      color: "text-zinc-400 bg-zinc-800/60 border-zinc-700/50",
    },
    active: {
      label: "Active",
      color: "text-emerald-400 bg-emerald-950/60 border-emerald-900/50",
    },
    paused: {
      label: "Paused",
      color: "text-yellow-400 bg-yellow-950/60 border-yellow-900/50",
    },
  };

  const currentConfig = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={isPending}
          className="btn-ghost flex items-center gap-1.5 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                currentStatus === "active" ? "bg-emerald-400" : currentStatus === "paused" ? "bg-yellow-400" : "bg-zinc-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                currentStatus === "active" ? "bg-emerald-400" : currentStatus === "paused" ? "bg-yellow-400" : "bg-zinc-400"
              }`} />
            </span>
          )}
          Status: <span className="font-semibold capitalize text-vault-text">{currentStatus}</span>
          <ChevronDown className="w-3.5 h-3.5 text-vault-muted" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={5}
          className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-vault-border bg-vault-surface p-1 shadow-xl animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {currentStatus === "draft" && (
            <DropdownMenu.Item
              onClick={() => handleStatusChange("active")}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-emerald-400 hover:bg-emerald-950/40 cursor-pointer outline-none transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Activate Program</span>
            </DropdownMenu.Item>
          )}

          {currentStatus === "active" && (
            <DropdownMenu.Item
              onClick={() => handleStatusChange("paused")}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-yellow-400 hover:bg-yellow-950/40 cursor-pointer outline-none transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Program</span>
            </DropdownMenu.Item>
          )}

          {currentStatus === "paused" && (
            <DropdownMenu.Item
              onClick={() => handleStatusChange("active")}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-emerald-400 hover:bg-emerald-950/40 cursor-pointer outline-none transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume Program</span>
            </DropdownMenu.Item>
          )}

          {(currentStatus === "active" || currentStatus === "paused" || currentStatus === "draft") && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-vault-border" />
              <DropdownMenu.Item
                onClick={() => {
                  if (confirm("Are you sure you want to archive this program? This action cannot be undone.")) {
                    handleStatusChange("archived");
                  }
                }}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-400 hover:bg-red-950/40 cursor-pointer outline-none transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive Program</span>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

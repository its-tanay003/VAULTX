"use client";

import { useTransition } from "react";
import { Play, Loader2 } from "lucide-react";
import { provisionWorkspace } from "@/app/actions/workspace";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ResumeWorkspaceButtonProps {
  workspaceId: string;
  repoId: string;
  branch: string;
}

export function ResumeWorkspaceButton({ workspaceId, repoId, branch }: ResumeWorkspaceButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleResume() {
    startTransition(async () => {
      try {
        // provisionWorkspace handles setting up a new active sandbox VM
        await provisionWorkspace(repoId, branch);
        toast.success("Workspace sandbox successfully re-provisioned");
        router.refresh();
      } catch (err) {
        toast.error("Failed to resume workspace environment");
      }
    });
  }

  return (
    <button
      onClick={handleResume}
      disabled={isPending}
      className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-1.5"
    >
      {isPending ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Provisioning Sandbox VM...
        </>
      ) : (
        <>
          <Play className="w-3.5 h-3.5" />
          Resume Workspace
        </>
      )}
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { Terminal, Loader2 } from "lucide-react";
import { provisionWorkspace } from "@/app/actions/workspace";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface OpenWorkspaceButtonProps {
  repoId: string;
  branch: string;
  existingWorkspaceId?: string | null;
}

export function OpenWorkspaceButton({
  repoId,
  branch,
  existingWorkspaceId,
}: OpenWorkspaceButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    if (existingWorkspaceId) {
      router.push(`/dashboard/workspaces/${existingWorkspaceId}`);
      return;
    }

    startTransition(async () => {
      try {
        const id = await provisionWorkspace(repoId, branch);
        toast.success("Workspace environment successfully provisioned");
        router.push(`/dashboard/workspaces/${id}`);
      } catch (err) {
        toast.error("Failed to provision workspace sandbox");
      }
    });
  }

  return (
    <button
      onClick={handleOpen}
      disabled={isPending}
      className="btn-primary text-xs py-1.5 flex items-center gap-1.5"
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Terminal className="w-3.5 h-3.5" />
      )}
      {existingWorkspaceId ? "Open Workspace" : "Provision Workspace"}
    </button>
  );
}

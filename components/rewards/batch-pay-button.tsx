"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Layers, Loader2 } from "lucide-react";
import { batchPayRewards } from "@/app/actions/rewards";

interface Props {
  approvedRewardIds: string[];
}

export function BatchPayButton({ approvedRewardIds }: Props) {
  const [pending, start] = useTransition();

  if (approvedRewardIds.length === 0) return null;

  function handleBatchPay() {
    start(async () => {
      try {
        const result = await batchPayRewards(approvedRewardIds);
        const parts: string[] = [];
        if (result.succeeded.length) parts.push(`${result.succeeded.length} paid`);
        if (result.held.length)      parts.push(`${result.held.length} held (below threshold)`);
        if (result.failed.length)    parts.push(`${result.failed.length} failed`);

        if (result.failed.length > 0) {
          toast.error(`Batch payout: ${parts.join(", ")}`);
        } else {
          toast.success(`Batch payout: ${parts.join(", ") || "nothing to pay"}`);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Batch payout failed");
      }
    });
  }

  return (
    <button
      onClick={handleBatchPay}
      disabled={pending}
      className="btn-teal text-xs flex items-center gap-1.5 disabled:opacity-50"
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
      Pay all approved ({approvedRewardIds.length})
    </button>
  );
}

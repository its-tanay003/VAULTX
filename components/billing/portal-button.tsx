"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";
import { openBillingPortal } from "@/app/actions/billing";

export function PortalButton() {
  const [isPending, startTransition] = useTransition();

  const handlePortal = () => {
    startTransition(async () => {
      try {
        const portalUrl = await openBillingPortal();
        if (portalUrl) {
          window.location.href = portalUrl;
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to open billing portal");
      }
    });
  };

  return (
    <button
      onClick={handlePortal}
      disabled={isPending}
      className="btn-teal px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Settings className="w-4 h-4" />
      )}
      Manage Billing & Subscription
    </button>
  );
}

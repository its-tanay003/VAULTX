"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { toast } from "sonner";
import { CreditCard, ExternalLink, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { startStripeOnboarding, refreshStripeStatus } from "@/app/actions/stripe-connect";
import { useSearchParams } from "next/navigation";

interface Props {
  onboardingComplete: boolean;
  payoutsEnabled:     boolean;
}

function StripeCallbackToast() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    if (stripeParam === "connected")     toast.success("Stripe account connected — you're ready to receive payouts");
    if (stripeParam === "incomplete")    toast.info("Almost there — a few more details are needed to enable payouts");
    if (stripeParam === "link_expired")  toast.info("That onboarding link expired — click Connect to get a fresh one");
    if (stripeParam === "error")         toast.error("Something went wrong connecting Stripe — please try again");
  }, [searchParams]);
  return null;
}

export function StripeConnectCard({ onboardingComplete, payoutsEnabled }: Props) {
  const [pending, start] = useTransition();
  const [checking, setChecking] = useState(false);

  function handleConnect() {
    start(async () => {
      try {
        const { url } = await startStripeOnboarding();
        window.location.href = url;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to start Stripe onboarding");
      }
    });
  }

  async function handleRefresh() {
    setChecking(true);
    try {
      const status = await refreshStripeStatus();
      if (status.payoutsEnabled) toast.success("Stripe account is ready for payouts");
      else toast.info("Onboarding isn't complete yet on Stripe's side");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to check status");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="vault-card p-4 flex items-center justify-between gap-4">
      <Suspense fallback={null}><StripeCallbackToast /></Suspense>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
          payoutsEnabled ? "bg-emerald-950/40 border-emerald-900/50" : "bg-vault-elevated border-vault-border"
        }`}>
          {payoutsEnabled
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            : <CreditCard className="w-4 h-4 text-vault-muted" />}
        </div>
        <div>
          <p className="text-sm font-medium">
            {payoutsEnabled ? "Stripe connected" : onboardingComplete ? "Finishing setup" : "Connect Stripe to get paid"}
          </p>
          <p className="text-xs text-vault-muted mt-0.5">
            {payoutsEnabled
              ? "Approved rewards are transferred here automatically"
              : "Required before your first reward can be paid out"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onboardingComplete && (
          <button onClick={handleRefresh} disabled={checking} className="btn-ghost text-xs flex items-center gap-1.5">
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
        )}
        {!payoutsEnabled && (
          <button onClick={handleConnect} disabled={pending} className="btn-teal text-xs flex items-center gap-1.5">
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            {onboardingComplete ? "Continue setup" : "Connect with Stripe"}
          </button>
        )}
      </div>
    </div>
  );
}

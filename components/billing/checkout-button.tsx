"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { startCheckout } from "@/app/actions/billing";

interface Plan {
  id: string;
  name: string;
  monthly_price_cents: number;
  yearly_price_cents: number;
  limits: any;
}

interface CheckoutButtonProps {
  plans: Plan[];
  currentTier: string;
  userId?: string;
}

export function CheckoutButton({ plans, currentTier, userId }: CheckoutButtonProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCheckout = (plan: Plan) => {
    if (!userId) {
      router.push("/login?next=/pricing");
      return;
    }

    if (currentTier !== "free") {
      router.push("/dashboard/org/billing");
      return;
    }

    setPendingPlanId(plan.id);
    startTransition(async () => {
      try {
        const checkoutUrl = await startCheckout(plan.id, billingCycle);
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to initiate checkout");
        setPendingPlanId(null);
      }
    });
  };

  const getPrice = (plan: Plan) => {
    const cents = billingCycle === "monthly" ? plan.monthly_price_cents : plan.yearly_price_cents;
    const divisor = billingCycle === "monthly" ? 100 : 1200; // display monthly equivalent for yearly
    return cents === 0 ? "0" : `$${Math.round(cents / divisor)}`;
  };

  const getFeaturesList = (planName: string) => {
    switch (planName.toLowerCase()) {
      case "free":
        return ["1 active bounty program", "5 AI triage requests / mo", "1 seat included", "Public listings"];
      case "pro":
        return ["5 active bounty programs", "100 AI triage requests / mo", "5 seats included", "1 PTaaS Concurrent run", "Solidity contract scans"];
      case "max":
        return ["20 active bounty programs", "500 AI triage requests / mo", "20 seats included", "5 PTaaS Concurrent runs", "SAML SSO Support"];
      case "pro max":
        return ["Unlimited bounty programs", "Unlimited AI triage requests", "Unlimited seats", "Unlimited PTaaS & CTF", "Dedicated support SLA"];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-12">
      {/* Toggle */}
      <div className="flex justify-center">
        <div className="bg-vault-surface border border-vault-border p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
              billingCycle === "monthly" ? "bg-vault-teal text-vault-bg font-bold shadow-md" : "text-vault-muted hover:text-vault-text"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1",
              billingCycle === "yearly" ? "bg-vault-teal text-vault-bg font-bold shadow-md" : "text-vault-muted hover:text-vault-text"
            )}
          >
            Yearly
            <span className="text-[9px] px-1 py-0.2 rounded-md bg-vault-teal-glow text-vault-teal border border-vault-teal/20 font-medium">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentTier.toLowerCase().replace(/\s+/g, "_") === plan.name.toLowerCase().replace(/\s+/g, "_");
          const isMax = plan.name.toLowerCase() === "max";
          const features = getFeaturesList(plan.name);

          return (
            <div
              key={plan.id}
              className={cn(
                "vault-card p-6 flex flex-col justify-between relative transition-all duration-300 hover:border-vault-teal/40 hover:-translate-y-1",
                isMax && "border-vault-teal/50 shadow-[0_0_30px_rgba(45,212,191,0.06)] bg-vault-teal/[0.01]"
              )}
            >
              {isMax && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-vault-teal text-vault-bg border border-vault-teal/20">
                  Most Popular
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-vault-text capitalize">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-3xl font-extrabold tracking-tight">{getPrice(plan)}</span>
                    <span className="text-xs text-vault-muted">/mo</span>
                  </div>
                  {billingCycle === "yearly" && plan.monthly_price_cents > 0 && (
                    <span className="text-[10px] text-vault-muted block mt-1">Billed annually</span>
                  )}
                </div>

                <div className="h-px bg-vault-border/50" />

                <ul className="space-y-3">
                  {features.map((f, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-vault-subtle leading-relaxed">
                      <Check className="w-3.5 h-3.5 text-vault-teal shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                {plan.name.toLowerCase() === "free" ? (
                  <button
                    disabled
                    className="w-full btn-ghost py-2.5 text-xs font-semibold cursor-not-allowed opacity-50"
                  >
                    {isCurrent ? "Current Plan" : "Always Free"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan)}
                    disabled={isPending && pendingPlanId === plan.id}
                    className={cn(
                      "w-full py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150",
                      isCurrent
                        ? "btn-ghost border-vault-teal/20 text-vault-teal"
                        : isMax
                        ? "btn-teal"
                        : "btn-ghost"
                    )}
                  >
                    {isPending && pendingPlanId === plan.id ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : currentTier !== "free" ? (
                      "Change Tier"
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

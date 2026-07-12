"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function BillingBanner() {
  const [isPastDue, setIsPastDue] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function checkBillingStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id, role")
        .eq("id", user.id)
        .single();

      if (profile?.org_id) {
        // Query active or past_due subscription status
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("org_id", profile.org_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub?.status === "past_due") {
          setIsPastDue(true);
        }
      }
    }

    checkBillingStatus();

    // Listen for realtime subscription updates (optional, handles updates immediately)
    const channel = supabase
      .channel("billing-banner-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        () => {
          checkBillingStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (!isPastDue) return null;

  return (
    <div className="w-full bg-red-950 border-b border-red-800 text-red-100 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-medium z-50">
      <div className="flex items-center gap-2">
        <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
        <span>
          <strong>Important:</strong> Your subscription payment failed. Your workspace is currently in a 7-day grace period. Update your card to prevent service downgrades.
        </span>
      </div>
      <Link
        href="/dashboard/org/billing"
        className="btn-teal px-3 py-1 flex items-center gap-1 text-xs whitespace-nowrap shrink-0 hover:bg-vault-teal-dim transition-colors"
      >
        Resolve billing <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

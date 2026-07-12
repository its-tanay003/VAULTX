import Link from "next/link";
import { ShieldCheck, Check, ArrowRight, Zap, Trophy, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FeatureComparison } from "@/components/billing/feature-comparison";
import { CheckoutButton } from "@/components/billing/checkout-button";

export const metadata = {
  title: "Pricing — VAULTX",
  description: "Simple, transparent pricing for teams and researchers.",
};

export default async function PricingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  let currentTier = "free";

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*, organizations!profiles_org_id_fkey(*)")
      .eq("id", user.id)
      .single();
    profile = data;
    if (profile?.organizations) {
      const org = Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations;
      currentTier = org?.subscription_tier || "free";
    }
  }

  // Fetch plans from database
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .order("monthly_price_cents", { ascending: true });

  const sortedPlans = plans || [];

  return (
    <div className="min-h-screen bg-vault-bg text-vault-text overflow-x-hidden relative">
      <div className="fixed inset-0 bg-grid pointer-events-none opacity-100" />
      <div className="fixed inset-x-0 top-0 h-[600px] bg-glow-teal pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-10 h-16 border-b border-vault-border/50 backdrop-blur-sm bg-vault-bg/80">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-vault-teal" />
          </div>
          <span className="font-semibold tracking-tight">VAULTX</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="btn-teal text-sm px-4 py-2 flex items-center gap-1.5">
              Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-vault-muted hover:text-vault-text transition-colors">
                Sign in
              </Link>
              <Link href="/login" className="btn-teal text-sm px-4 py-2 flex items-center gap-1.5">
                Get started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-20 relative z-10 space-y-16">
        <div className="text-center max-w-xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-vault-border text-xs text-vault-teal bg-vault-teal/5">
            Transparent Pricing
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Plans for security teams of all sizes</h1>
          <p className="text-vault-muted text-sm leading-relaxed">
            Get automated AI triage, Solidity audits, real-time PTaaS concurrent engagements, and live CTFs in one secure platform.
          </p>
        </div>

        {/* Pricing Matrix Cards */}
        <CheckoutButton plans={sortedPlans} currentTier={currentTier} userId={user?.id} />

        {/* Collapsible Feature Comparison Table */}
        <div className="max-w-4xl mx-auto pt-10">
          <h3 className="text-lg font-medium text-center mb-6">Detailed Plan Comparison</h3>
          <FeatureComparison currentTier={currentTier} />
        </div>
      </div>
    </div>
  );
}

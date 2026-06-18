"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Building2, Shield, ChevronRight, Loader2, ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { cn, slugify } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";

type Step = "role" | "profile" | "org";

export default function OnboardingPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step,      setStep]      = useState<Step>("role");
  const [role,      setRole]      = useState<"researcher" | "org" | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [fullName,  setFullName]  = useState("");
  const [username,  setUsername]  = useState("");
  const [orgName,   setOrgName]   = useState("");
  const [orgWebsite,setOrgWebsite]= useState("");

  async function handleComplete() {
    if (!role) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let orgId: string | null = null;

      // Create org if needed
      if (role === "org" && orgName) {
        const { data: org, error: orgErr } = await supabase
          .from("organizations")
          .insert({
            name:     orgName,
            slug:     slugify(orgName),
            website:  orgWebsite || null,
            owner_id: user.id,
          })
          .select("id")
          .single();

        if (orgErr) throw orgErr;
        orgId = org.id;
      }

      // Upsert profile
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id:           user.id,
        email:        user.email!,
        full_name:    fullName || user.user_metadata?.full_name || null,
        avatar_url:   user.user_metadata?.avatar_url || null,
        username:     username || null,
        role:         role as UserRole,
        org_id:       orgId,
        is_onboarded: true,
      });

      if (profileErr) throw profileErr;

      toast.success("Welcome to VAULTX!");
      router.push(role === "org" ? "/dashboard/org" : "/dashboard/researcher");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Setup failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-vault-bg flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed inset-x-0 top-0 h-96 bg-glow-teal pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-vault-teal" />
          </div>
          <span className="text-xl font-semibold">VAULTX</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {(["role", "profile", "org"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border transition-all",
                step === s
                  ? "bg-vault-teal text-vault-bg border-vault-teal"
                  : (["role","profile","org"].indexOf(step) > i)
                  ? "bg-vault-teal/10 border-vault-teal text-vault-teal"
                  : "bg-vault-elevated border-vault-border text-vault-muted"
              )}>
                {["role","profile","org"].indexOf(step) > i
                  ? <CheckCircle2 className="w-4 h-4" />
                  : i + 1}
              </div>
              {i < 2 && (
                <div className={cn(
                  "w-12 h-px transition-colors",
                  ["role","profile","org"].indexOf(step) > i
                    ? "bg-vault-teal" : "bg-vault-border"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="vault-card p-6">

          {/* ── Step 1: Role ────────────────────────────────────────────── */}
          {step === "role" && (
            <div>
              <h2 className="text-lg font-semibold mb-1">How will you use VAULTX?</h2>
              <p className="text-sm text-vault-muted mb-5">Choose your primary role to get started</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <RoleCard
                  icon={<Shield className="w-6 h-6 text-vault-teal" />}
                  title="Security Researcher"
                  description="Find vulnerabilities, submit reports, earn rewards from bug bounty programs"
                  selected={role === "researcher"}
                  onClick={() => setRole("researcher")}
                />
                <RoleCard
                  icon={<Building2 className="w-6 h-6 text-vault-teal" />}
                  title="Organization"
                  description="Run bug bounty or VDP programs, manage submissions, reward researchers"
                  selected={role === "org"}
                  onClick={() => setRole("org")}
                />
              </div>

              <button
                onClick={() => { if (role) setStep("profile"); }}
                disabled={!role}
                className="mt-5 w-full btn-teal flex items-center justify-center gap-2 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Profile ─────────────────────────────────────────── */}
          {step === "profile" && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Set up your profile</h2>
              <p className="text-sm text-vault-muted mb-5">You can update this anytime from settings</p>

              <div className="space-y-4">
                <Field label="Full name" required>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    className="vault-input w-full"
                  />
                </Field>
                <Field label="Username" hint="Shown on leaderboards and submissions">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="janesmith"
                    className="vault-input w-full"
                  />
                </Field>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep("role")} className="btn-ghost flex-1 py-2.5">
                  Back
                </button>
                <button
                  onClick={() => role === "org" ? setStep("org") : handleComplete()}
                  disabled={!fullName.trim() || loading}
                  className="btn-teal flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {role === "org" ? "Continue" : "Finish setup"}
                  {!loading && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Org setup ───────────────────────────────────────── */}
          {step === "org" && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Create your organization</h2>
              <p className="text-sm text-vault-muted mb-5">You can add more details later</p>

              <div className="space-y-4">
                <Field label="Organization name" required>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Corp"
                    className="vault-input w-full"
                  />
                </Field>
                <Field label="Website" hint="Optional">
                  <input
                    type="url"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    placeholder="https://acme.com"
                    className="vault-input w-full"
                  />
                </Field>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep("profile")} className="btn-ghost flex-1 py-2.5">
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!orgName.trim() || loading}
                  className="btn-teal flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Launch workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function RoleCard({
  icon, title, description, selected, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left p-4 rounded-xl border transition-all duration-150",
        selected
          ? "border-vault-teal bg-vault-teal/5"
          : "border-vault-border bg-vault-elevated hover:border-vault-border-bright"
      )}
    >
      <div className="mb-3">{icon}</div>
      <div className="font-medium text-sm mb-1">{title}</div>
      <div className="text-xs text-vault-muted leading-relaxed">{description}</div>
      {selected && (
        <div className="mt-3 flex items-center gap-1 text-vault-teal text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> Selected
        </div>
      )}
    </button>
  );
}

function Field({
  label, hint, required, children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-vault-teal ml-0.5">*</span>}
        {hint && <span className="font-normal text-vault-muted ml-1.5">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

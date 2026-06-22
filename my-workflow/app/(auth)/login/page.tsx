"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Mail, Loader2, Chrome } from "lucide-react";
import { cn } from "@/lib/utils";

function LoginForm() {
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") ?? "/dashboard";
  const authError    = searchParams.get("error");

  const [email,       setEmail]       = useState("");
  const [emailSent,   setEmailSent]   = useState(false);
  const [loadingMail, setLoadingMail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const supabase = createClient();

  /* ─── Magic link ───────────────────────────────────────────────────────── */
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoadingMail(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setEmailSent(true);
      toast.success("Magic link sent — check your inbox");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send link";
      toast.error(msg);
    } finally {
      setLoadingMail(false);
    }
  }

  /* ─── Google OAuth ─────────────────────────────────────────────────────── */
  async function handleGoogle() {
    setLoadingGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google auth failed";
      toast.error(msg);
      setLoadingGoogle(false);
    }
  }

  return (
    <div className="min-h-screen bg-vault-bg flex flex-col items-center justify-center p-4">
      {/* Grid background */}
      <div className="fixed inset-0 bg-grid opacity-100 pointer-events-none" />
      {/* Teal glow */}
      <div className="fixed inset-x-0 top-0 h-96 bg-glow-teal pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-vault-teal" />
          </div>
          <span className="text-xl font-semibold tracking-tight">VAULTX</span>
        </div>

        <div className="vault-card p-6">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-semibold mb-1">Welcome back</h1>
            <p className="text-sm text-vault-muted">Sign in to your security workspace</p>
          </div>

          {/* Error banner */}
          {authError && (
            <div className="mb-4 px-3 py-2.5 bg-red-950/50 border border-red-900/50 rounded-lg text-sm text-red-400">
              Authentication failed. Please try again.
            </div>
          )}

          {emailSent ? (
            /* ── Magic link sent state ─────────────────────────────────── */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-vault-teal" />
              </div>
              <p className="font-medium mb-1">Check your email</p>
              <p className="text-sm text-vault-muted">
                We sent a magic link to{" "}
                <span className="text-vault-text">{email}</span>
              </p>
              <button
                onClick={() => setEmailSent(false)}
                className="mt-4 text-sm text-vault-teal hover:text-vault-teal/80 transition-colors"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              {/* ── Google ─────────────────────────────────────────────── */}
              <button
                onClick={handleGoogle}
                disabled={loadingGoogle}
                className={cn(
                  "w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium",
                  "bg-vault-elevated border border-vault-border",
                  "hover:bg-vault-border/60 hover:border-vault-border-bright",
                  "transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loadingGoogle ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Chrome className="w-4 h-4" />
                )}
                Continue with Google
              </button>

              {/* ── Divider ────────────────────────────────────────────── */}
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-vault-border" />
                <span className="text-xs text-vault-muted">or</span>
                <div className="h-px flex-1 bg-vault-border" />
              </div>

              {/* ── Magic link form ─────────────────────────────────────── */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg text-sm",
                      "bg-vault-surface border border-vault-border",
                      "text-vault-text placeholder:text-vault-muted",
                      "focus:outline-none focus:border-vault-teal/50 focus:ring-1 focus:ring-vault-teal/30",
                      "transition-colors duration-150"
                    )}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingMail || !email.trim()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium",
                    "bg-vault-teal text-vault-bg",
                    "hover:bg-vault-teal-dim",
                    "transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {loadingMail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Send magic link
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-vault-muted mt-4">
          By signing in you agree to our{" "}
          <a href="/terms" className="text-vault-subtle hover:text-vault-teal transition-colors">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-vault-subtle hover:text-vault-teal transition-colors">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-vault-bg flex flex-col items-center justify-center p-4">
        <div className="text-sm text-vault-muted">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

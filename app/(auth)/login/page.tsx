"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Mail, Loader2 } from "lucide-react";
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
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
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

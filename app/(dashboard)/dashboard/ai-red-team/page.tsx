"use client";

import { useState, useTransition } from "react";
import { Zap, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { joinWaitlist } from "@/app/actions/waitlist";
import { toast } from "sonner";

export default function AIRedTeamPage() {
  const [joined,  setJoined]  = useState(false);
  const [pending, start]      = useTransition();

  function handleJoin() {
    start(async () => {
      try {
        await joinWaitlist("ai_red_team");
        setJoined(true);
        toast.success("You're on the list — we'll notify you at launch");
      } catch {
        toast.error("Failed to join waitlist");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto animate-in">
      <div className="vault-card p-10 text-center relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-32 bg-glow-teal-sm pointer-events-none" />

        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-vault-teal/10 border border-vault-teal/30 flex items-center justify-center mx-auto mb-5">
            <Zap className="w-7 h-7 text-vault-teal" />
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 bg-vault-teal/10 text-vault-teal border border-vault-teal/20 rounded-full mb-4">
            <Sparkles className="w-3 h-3" /> On the roadmap
          </span>

          <h1 className="text-2xl font-semibold mb-3">AI Red Team</h1>
          <p className="text-sm text-vault-muted leading-relaxed max-w-md mx-auto mb-8">
            Autonomous AI agents that probe your attack surface continuously —
            not a one-time scan, but an ongoing adversarial process that
            surfaces findings into the same triage queue your human
            researchers already use. First-class AI red teaming as a
            platform primitive, not a bolt-on.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8 max-w-md mx-auto">
            {[
              "Continuous autonomous probing",
              "Findings route through same triage",
              "Configurable aggression levels",
              "Full reasoning trace per finding",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-vault-subtle">
                <CheckCircle2 className="w-3.5 h-3.5 text-vault-teal/60 shrink-0" />
                {f}
              </div>
            ))}
          </div>

          {joined ? (
            <div className="flex items-center justify-center gap-2 text-sm text-vault-teal font-medium">
              <CheckCircle2 className="w-4 h-4" /> You're on the waitlist
            </div>
          ) : (
            <button
              onClick={handleJoin}
              disabled={pending}
              className="btn-teal inline-flex items-center gap-2 disabled:opacity-50"
            >
              {pending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <>Join the waitlist <ArrowRight className="w-4 h-4" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

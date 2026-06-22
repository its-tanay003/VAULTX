"use client";

import { useEffect, useState } from "react";
import { createClient }        from "@/lib/supabase/client";
import { toast }               from "sonner";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubmissionStatus } from "@/lib/supabase/types";

interface Props {
  submissionId:   string;
  initialStatus:  SubmissionStatus;
  initialAiDone?: boolean;
}

const STATUS_CFG: Record<SubmissionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  new:        { label: "New",       color: "text-sky-400",     icon: <Clock className="w-3.5 h-3.5"        /> },
  triaging:   { label: "Triaging",  color: "text-violet-400",  icon: <Clock className="w-3.5 h-3.5"        /> },
  needs_info: { label: "Info Req",  color: "text-yellow-400",  icon: <AlertTriangle className="w-3.5 h-3.5"/> },
  accepted:   { label: "Accepted",  color: "text-emerald-400", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected:   { label: "Rejected",  color: "text-red-400",     icon: <XCircle className="w-3.5 h-3.5"      /> },
  duplicate:  { label: "Duplicate", color: "text-zinc-400",    icon: <XCircle className="w-3.5 h-3.5"      /> },
  wont_fix:   { label: "Won't Fix", color: "text-zinc-500",    icon: <XCircle className="w-3.5 h-3.5"      /> },
  resolved:   { label: "Resolved",  color: "text-teal-400",    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

export function RealtimeSubmissionStatus({ submissionId, initialStatus, initialAiDone }: Props) {
  const [status,  setStatus]  = useState<SubmissionStatus>(initialStatus);
  const [aiDone,  setAiDone]  = useState(initialAiDone ?? false);
  const [pulse,   setPulse]   = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`submission:${submissionId}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "submissions",
          filter: `id=eq.${submissionId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;

          // Status changed
          if (updated.status && updated.status !== status) {
            const newStatus = updated.status as SubmissionStatus;
            setStatus(newStatus);
            setPulse(true);
            setTimeout(() => setPulse(false), 2000);

            const cfg = STATUS_CFG[newStatus];
            if (newStatus === "accepted") {
              toast.success(`Report accepted! ${cfg?.label}`);
            } else if (newStatus === "needs_info") {
              toast.warning("Triager needs more information");
            } else if (newStatus === "rejected") {
              toast.error("Report was not accepted");
            }
          }

          // AI analysis completed
          if (updated.ai_severity && !aiDone) {
            setAiDone(true);
            toast.info("AI analysis complete", {
              description: `Severity: ${updated.ai_severity} (${Math.round(((updated.ai_confidence as number) ?? 0) * 100)}% confidence)`,
              icon: <Zap className="w-4 h-4 text-vault-teal" />,
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [submissionId, status, aiDone]);

  const cfg = STATUS_CFG[status] ?? STATUS_CFG.new;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all",
      status === "accepted" ? "border-emerald-900/50 bg-emerald-950/50"
        : status === "rejected" ? "border-red-900/50 bg-red-950/50"
        : status === "needs_info" ? "border-yellow-900/50 bg-yellow-950/50"
        : status === "duplicate" ? "border-zinc-700/50 bg-zinc-800/50"
        : "border-vault-border bg-vault-elevated",
      pulse && "ring-2 ring-offset-1 ring-offset-vault-bg ring-vault-teal/40",
      cfg.color
    )}>
      {cfg.icon}
      {cfg.label}
      {!aiDone && status === "new" && (
        <span className="ml-1 flex items-center gap-1 text-vault-muted">
          <Zap className="w-2.5 h-2.5 animate-pulse" />
          AI…
        </span>
      )}
    </div>
  );
}

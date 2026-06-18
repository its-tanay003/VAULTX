"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, MessageSquare,
  Copy, Archive, Loader2,
} from "lucide-react";
import {
  acceptSubmission, rejectSubmission,
  markDuplicate, requestMoreInfo, markWontFix,
} from "@/app/actions/triage";
import { toast } from "sonner";
import { cn }    from "@/lib/utils";
import type { SubmissionStatus } from "@/lib/supabase/types";

interface Props {
  submissionId:  string;
  currentStatus: SubmissionStatus;
}

type ActionKey = "accept" | "reject" | "duplicate" | "needs_info" | "wont_fix";

const ACTIONS: {
  key:     ActionKey;
  label:   string;
  icon:    React.ReactNode;
  cls:     string;
  needs:   SubmissionStatus[];
}[] = [
  {
    key:   "accept",
    label: "Accept",
    icon:  <CheckCircle2 className="w-4 h-4" />,
    cls:   "text-emerald-400 border-emerald-900/50 bg-emerald-950/30 hover:bg-emerald-950/50",
    needs: ["new","triaging","needs_info"],
  },
  {
    key:   "reject",
    label: "Reject",
    icon:  <XCircle className="w-4 h-4" />,
    cls:   "text-red-400 border-red-900/50 bg-red-950/30 hover:bg-red-950/50",
    needs: ["new","triaging","needs_info"],
  },
  {
    key:   "duplicate",
    label: "Mark Duplicate",
    icon:  <Copy className="w-4 h-4" />,
    cls:   "text-zinc-400 border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50",
    needs: ["new","triaging","needs_info"],
  },
  {
    key:   "needs_info",
    label: "Request Info",
    icon:  <MessageSquare className="w-4 h-4" />,
    cls:   "text-yellow-400 border-yellow-900/50 bg-yellow-950/30 hover:bg-yellow-950/50",
    needs: ["new","triaging"],
  },
  {
    key:   "wont_fix",
    label: "Won't Fix",
    icon:  <Archive className="w-4 h-4" />,
    cls:   "text-zinc-500 border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-800/30",
    needs: ["new","triaging","needs_info","accepted"],
  },
];

export function TriageActions({ submissionId, currentStatus }: Props) {
  const [active,  setActive]  = useState<ActionKey | null>(null);
  const [note,    setNote]    = useState("");
  const [origId,  setOrigId]  = useState("");
  const [pending, start]      = useTransition();

  const available = ACTIONS.filter((a) => a.needs.includes(currentStatus));

  if (available.length === 0) {
    return (
      <p className="text-sm text-vault-muted italic">
        No triage actions available for status: {currentStatus}
      </p>
    );
  }

  function reset() { setActive(null); setNote(""); setOrigId(""); }

  async function handleAction() {
    if (!active) return;
    start(async () => {
      try {
        switch (active) {
          case "accept":
            await acceptSubmission(submissionId, note || undefined);
            toast.success("Submission accepted ✓");
            break;
          case "reject":
            if (!note.trim()) { toast.error("Rejection reason required"); return; }
            await rejectSubmission(submissionId, note);
            toast.success("Submission rejected");
            break;
          case "duplicate":
            if (!origId.trim()) { toast.error("Original submission ID required"); return; }
            await markDuplicate(submissionId, origId, note || undefined);
            toast.success("Marked as duplicate");
            break;
          case "needs_info":
            if (!note.trim()) { toast.error("Question for researcher required"); return; }
            await requestMoreInfo(submissionId, note);
            toast.success("Researcher notified");
            break;
          case "wont_fix":
            if (!note.trim()) { toast.error("Reason required"); return; }
            await markWontFix(submissionId, note);
            toast.success("Marked as won't fix");
            break;
        }
        reset();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {available.map((action) => (
          <button
            key={action.key}
            onClick={() => setActive(active === action.key ? null : action.key)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all",
              action.cls,
              active === action.key && "ring-2 ring-offset-1 ring-offset-vault-bg ring-current"
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* Expanded action panel */}
      {active && (
        <div className="vault-card p-4 border-vault-teal/20 space-y-3 animate-in">
          <h4 className="text-sm font-medium">
            {ACTIONS.find((a) => a.key === active)?.label}
          </h4>

          {active === "duplicate" && (
            <div>
              <label className="field-label mb-1.5 block">Original submission ID</label>
              <input
                value={origId}
                onChange={(e) => setOrigId(e.target.value)}
                placeholder="Paste the UUID of the original submission"
                className="vault-input font-mono text-xs"
              />
            </div>
          )}

          <div>
            <label className="field-label mb-1.5 block">
              {active === "reject"     ? "Rejection reason *"
              : active === "needs_info" ? "Question for researcher *"
              : active === "wont_fix"   ? "Reason *"
              : "Note (optional)"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={
                active === "accept"     ? "Optional acceptance note to researcher…"
                : active === "reject"   ? "Why is this being rejected? Be constructive…"
                : active === "duplicate"? "Note for researcher (e.g. first reported in #ABC123)…"
                : active === "needs_info"? "What specific information do you need from the researcher?"
                : "Why won't this be fixed?"
              }
              className="vault-input resize-none"
            />
          </div>

          {/* Safety reminder for accept */}
          {active === "accept" && (
            <div className="flex gap-2 bg-vault-teal/5 border border-vault-teal/20 rounded-lg p-3">
              <AlertTriangle className="w-3.5 h-3.5 text-vault-teal shrink-0 mt-0.5" />
              <p className="text-xs text-vault-muted">
                Accepting moves this to the reward approval queue.
                The reward amount must still be approved by a human — AI cannot approve payments.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={reset} className="btn-ghost flex-1 text-sm">
              Cancel
            </button>
            <button
              onClick={handleAction}
              disabled={pending}
              className="btn-teal flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              {pending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                : `Confirm ${ACTIONS.find((a) => a.key === active)?.label}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

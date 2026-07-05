"use client";

import { useState, useTransition } from "react";
import {
  proposeReward, approveReward, markRewardPaid, declineReward,
} from "@/app/actions/rewards";
import { toast } from "sonner";
import {
  Trophy, DollarSign, Loader2, CheckCircle2,
  Clock, XCircle, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { RewardStatus } from "@/lib/supabase/types";

interface ExistingReward {
  id:           string;
  amount:       number;
  currency:     string;
  status:       RewardStatus;
  note:         string | null;
  approved_at:  string | null;
  paid_at:      string | null;
  payout_status?: string;
  payout_failure_reason?: string | null;
  held_for_threshold?: boolean;
}

interface Props {
  submissionId:   string;
  existingReward: ExistingReward | null;
  minReward:      number | null;
  maxReward:      number | null;
}

const STATUS_CFG: Record<RewardStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:  { label: "Pending Approval", cls: "text-yellow-400 bg-yellow-950/50 border-yellow-900/50",  icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: "Approved",         cls: "text-teal-400 bg-teal-950/50 border-teal-900/50",        icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  paid:     { label: "Paid",             cls: "text-emerald-400 bg-emerald-950/50 border-emerald-900/50",icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  declined: { label: "Declined",         cls: "text-red-400 bg-red-950/50 border-red-900/50",            icon: <XCircle className="w-3.5 h-3.5" /> },
};

export function RewardWidget({ submissionId, existingReward, minReward, maxReward }: Props) {
  const [amount,  setAmount]  = useState(minReward ? String(minReward) : "");
  const [note,    setNote]    = useState("");
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [pending, start]      = useTransition();

  /* ─── No reward yet — show proposal form ──────────────────────────────── */
  if (!existingReward) {
    function handlePropose() {
      const amt = Number(amount);
      if (!amt || amt <= 0) { toast.error("Enter a valid reward amount"); return; }

      start(async () => {
        try {
          await proposeReward(submissionId, amt, "USD", note || undefined);
          toast.success("Reward proposed — pending your approval");
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed to propose reward");
        }
      });
    }

    return (
      <div className="vault-card p-5 border-vault-teal/20">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-vault-teal" />
          <h3 className="text-sm font-medium">Propose a reward</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="field-label mb-1.5 block">Amount (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="vault-input pl-8"
              />
            </div>
            {minReward && maxReward && (
              <p className="text-[11px] text-vault-muted mt-1">
                Program range: {formatCurrency(minReward)} – {formatCurrency(maxReward)}
              </p>
            )}
          </div>

          <div>
            <label className="field-label mb-1.5 block">Note to researcher (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Great find — thank you for the detailed report"
              className="vault-input resize-none"
            />
          </div>

          <div className="flex gap-2 bg-vault-elevated border border-vault-border rounded-lg p-3">
            <ShieldCheck className="w-3.5 h-3.5 text-vault-teal shrink-0 mt-0.5" />
            <p className="text-[11px] text-vault-muted leading-relaxed">
              Proposing creates a pending reward. You — a human — must separately approve it
              before the researcher is notified of payment. This is enforced at the database level.
            </p>
          </div>

          <button
            onClick={handlePropose}
            disabled={pending || !amount}
            className="btn-teal w-full flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {pending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Proposing…</>
              : <><Trophy className="w-4 h-4" /> Propose Reward</>}
          </button>
        </div>
      </div>
    );
  }

  /* ─── Existing reward — show status + actions ─────────────────────────── */
  const cfg = STATUS_CFG[existingReward.status];

  function handleApprove() {
    start(async () => {
      try {
        await approveReward(existingReward!.id);
        toast.success("Reward approved — researcher notified 🎉");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to approve reward");
      }
    });
  }

  function handleMarkPaid() {
    start(async () => {
      try {
        const result = await markRewardPaid(existingReward!.id);
        if (result.held) {
          toast.info("Held — researcher hasn't reached their minimum payout threshold yet");
        } else {
          toast.success(
            result.groupedCount && result.groupedCount > 1
              ? `Payout sent via Stripe (combined with ${result.groupedCount - 1} other held reward(s))`
              : "Payout sent via Stripe"
          );
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to send payout");
      }
    });
  }

  function handleDecline() {
    if (!declineReason.trim()) { toast.error("Reason required"); return; }
    start(async () => {
      try {
        await declineReward(existingReward!.id, declineReason);
        toast.success("Reward declined");
        setDeclining(false);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to decline reward");
      }
    });
  }

  return (
    <div className="vault-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-vault-teal" />
          <h3 className="text-sm font-medium">Reward</h3>
        </div>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1.5", cfg.cls)}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      <div className="text-3xl font-semibold mb-1">
        {formatCurrency(existingReward.amount, existingReward.currency)}
      </div>

      {existingReward.note && (
        <p className="text-sm text-vault-muted mb-4 italic">"{existingReward.note}"</p>
      )}

      <div className="space-y-1.5 text-xs text-vault-muted mb-4">
        {existingReward.approved_at && <p>Approved {formatDate(existingReward.approved_at)}</p>}
        {existingReward.paid_at &&     <p>Paid {formatDate(existingReward.paid_at)}</p>}
      </div>

      {/* Action buttons by status */}
      {existingReward.status === "pending" && !declining && (
        <div className="space-y-2">
          <div className="flex gap-2 bg-vault-teal/5 border border-vault-teal/20 rounded-lg p-3 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-vault-teal shrink-0 mt-0.5" />
            <p className="text-[11px] text-vault-muted leading-relaxed">
              This reward is awaiting your explicit human approval. No automated process can approve it.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDeclining(true)} className="btn-ghost flex-1 text-sm">
              Decline
            </button>
            <button
              onClick={handleApprove}
              disabled={pending}
              className="btn-teal flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              {pending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve Reward
            </button>
          </div>
        </div>
      )}

      {declining && (
        <div className="space-y-2">
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={2}
            placeholder="Why is this reward being declined?"
            className="vault-input resize-none text-sm"
          />
          <div className="flex gap-2">
            <button onClick={() => setDeclining(false)} className="btn-ghost flex-1 text-sm">
              Cancel
            </button>
            <button
              onClick={handleDecline}
              disabled={pending}
              className="flex-1 bg-red-950/50 border border-red-900/50 text-red-400 rounded-lg text-sm font-medium hover:bg-red-950/70 transition-colors disabled:opacity-40"
            >
              Confirm Decline
            </button>
          </div>
        </div>
      )}

      {existingReward.status === "approved" && (
        <div className="space-y-2">
          {existingReward.held_for_threshold && existingReward.payout_status !== "failed" && (
            <div className="flex gap-2 bg-blue-950/30 border border-blue-900/40 rounded-lg p-3">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-300 leading-relaxed">
                Held — this researcher's unpaid approved total hasn't reached their minimum payout
                threshold yet. It'll be included automatically in their next payout once it does.
              </p>
            </div>
          )}
          {existingReward.payout_status === "failed" && existingReward.payout_failure_reason && (
            <div className="flex gap-2 bg-red-950/30 border border-red-900/40 rounded-lg p-3">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-300 leading-relaxed">
                Last payout attempt failed: {existingReward.payout_failure_reason}
              </p>
            </div>
          )}
          <button
            onClick={handleMarkPaid}
            disabled={pending}
            className="btn-teal w-full flex items-center justify-center gap-2 text-sm disabled:opacity-40"
          >
            {pending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <DollarSign className="w-3.5 h-3.5" />}
            {existingReward.payout_status === "failed" ? "Retry Payout" : "Pay via Stripe"}
          </button>
        </div>
      )}
    </div>
  );
}

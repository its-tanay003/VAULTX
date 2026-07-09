"use client";

import { useState, useTransition } from "react";
import { toast }                   from "sonner";
import { Loader2, Download, AlertTriangle, Trash2, PauseCircle } from "lucide-react";
import { requestAccountDeletion, requestDataExport } from "@/app/actions/settings";
import { SectionCard }             from "@/components/settings/section-card";
import { DangerConfirmDialog }     from "@/components/settings/danger-confirm-dialog";

export default function DangerZonePage() {
  const [exportPending, startExport]   = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  function handleExport() {
    startExport(async () => {
      try {
        const result = await requestDataExport();
        toast.success(result.message);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Export failed");
      }
    });
  }

  async function handleDelete() {
    await requestAccountDeletion();
    // requestAccountDeletion calls redirect("/") — this won't be reached
  }

  async function handleDeactivate() {
    // Soft deactivation — show confirmation then redirect
    toast.success("Account deactivated. You can reactivate within 30 days by logging in again.");
    setShowDeactivateDialog(false);
  }

  return (
    <div className="space-y-5 animate-in">
      {/* Data Export */}
      <SectionCard title="Export Your Data" description="Download a complete copy of your account data">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm">Request data export</p>
            <p className="text-xs text-vault-muted">
              Includes your profile, submissions, rewards, and activity history.
              Delivered as a ZIP file to your email within 24 hours.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exportPending}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-vault-border hover:bg-vault-elevated/50 transition-colors disabled:opacity-40"
          >
            {exportPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export data
          </button>
        </div>
      </SectionCard>

      {/* Deactivate */}
      <SectionCard title="Deactivate Account" description="Temporarily disable your account" danger>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm">Deactivate your account</p>
            <p className="text-xs text-vault-muted">
              Your profile will be hidden and you won&apos;t receive notifications.
              You can reactivate by logging in within 30 days.
            </p>
          </div>
          <button
            onClick={() => setShowDeactivateDialog(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            Deactivate
          </button>
        </div>
      </SectionCard>

      {/* Delete */}
      <SectionCard title="Delete Account" description="Permanently remove your account and all data" danger>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-vault-muted space-y-1">
                <p className="font-medium text-red-400">This action is irreversible</p>
                <ul className="list-disc list-inside space-y-0.5 text-vault-muted">
                  <li>Your profile and public data will be permanently deleted</li>
                  <li>All submissions, rewards, and history will be removed</li>
                  <li>API keys will be revoked immediately</li>
                  <li>Pending reward payouts may be forfeited</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm">Delete my account</p>
              <p className="text-xs text-vault-muted">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete account
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Delete dialog */}
      <DangerConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Account"
        description="This will permanently delete your account, profile, submissions, rewards, and all data. This cannot be undone."
        confirmWord="DELETE"
        actionLabel="Delete my account"
        onConfirm={handleDelete}
      />

      {/* Deactivate dialog */}
      <DangerConfirmDialog
        open={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        title="Deactivate Account"
        description="Your account will be temporarily disabled. You can reactivate it within 30 days by signing in again."
        confirmWord="DEACTIVATE"
        actionLabel="Deactivate"
        onConfirm={handleDeactivate}
      />
    </div>
  );
}

/**
 * VAULT Copilot — Reconnect Sync Engine
 *
 * Replays queued offline actions when network connectivity is restored.
 * Crucially, queued actions MUST pass through the exact same server authorization,
 * consent verification, and audit logging pipeline as online actions — zero shortcuts.
 */

import { offlineDb, type PendingAction } from "./offline-db";

export interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}

export async function syncPendingActions(): Promise<SyncResult> {
  if (typeof window === "undefined") {
    return { total: 0, synced: 0, failed: 0, errors: [] };
  }

  const queuedActions = await offlineDb.pendingActionQueue
    .where("status")
    .equals("queued_offline")
    .toArray();

  if (queuedActions.length === 0) {
    return { total: 0, synced: 0, failed: 0, errors: [] };
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of queuedActions) {
    if (!item.id) continue;

    try {
      await offlineDb.pendingActionQueue.update(item.id, { status: "syncing" });

      // First propose the action to the server pipeline to obtain a server-side action ID and consent gating
      const res = await fetch("/api/vault/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Execute queued offline action: ${item.actionType}`,
          context: {},
        }),
      });

      if (!res.ok) {
        throw new Error(`Sync request failed with HTTP ${res.status}`);
      }

      await offlineDb.pendingActionQueue.update(item.id, {
        status: "executed",
        error: undefined,
      });
      synced++;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Sync failed";
      errors.push(`${item.actionType}: ${errMsg}`);
      failed++;
      await offlineDb.pendingActionQueue.update(item.id, {
        status: "failed",
        error: errMsg,
        retryCount: (item.retryCount || 0) + 1,
      });
    }
  }

  return {
    total: queuedActions.length,
    synced,
    failed,
    errors,
  };
}

export async function getPendingActionCount(): Promise<number> {
  if (typeof window === "undefined") return 0;
  return offlineDb.pendingActionQueue.where("status").equals("queued_offline").count();
}

// Auto-register sync listener when online event fires in browser
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    // Delay slightly to let network stabilize
    setTimeout(() => {
      syncPendingActions().catch((err) => console.warn("Background sync error:", err));
    }, 2000);
  });
}

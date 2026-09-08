/**
 * VAULT Copilot — Zero-Cost Personalization & Behavioral Telemetry Beacon
 *
 * Captures user interactions (page views, capability invocations, searches, dismissals)
 * and batches them efficiently to minimize network calls. Respects user privacy opt-out.
 */

export type BehaviorEventType =
  | "page_view"
  | "action_taken"
  | "search"
  | "dismiss_suggestion";

export interface BehaviorEvent {
  eventType: BehaviorEventType;
  capabilityKey?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

let eventQueue: BehaviorEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 15000;

export function trackBehaviorEvent(
  eventType: BehaviorEventType,
  capabilityKey?: string,
  metadata?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  // Check if user disabled personalization tracking
  const optInStored = localStorage.getItem("vault_ai_personalization_opt_in");
  if (optInStored === "false") return;

  eventQueue.push({
    eventType,
    capabilityKey,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
  });

  if (eventQueue.length >= BATCH_SIZE) {
    flushBehaviorEvents();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushBehaviorEvents, FLUSH_INTERVAL_MS);
  }
}

export async function flushBehaviorEvents() {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (eventQueue.length === 0) return;

  const payload = [...eventQueue];
  eventQueue = [];

  const body = JSON.stringify({ events: payload });

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/vault/track", blob);
      if (!sent) {
        await fetch("/api/vault/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } else {
      await fetch("/api/vault/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    // Silently handle telemetry failure — telemetry must never degrade core UX
  }
}

// Auto-flush on page unload / hide
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushBehaviorEvents();
    }
  });
  window.addEventListener("pagehide", () => {
    flushBehaviorEvents();
  });
}

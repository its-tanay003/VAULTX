"use client";

import { useEffect, useState } from "react";
import { Loader2, BellOff } from "lucide-react";
import { toast } from "sonner";
import { SettingsToggle } from "@/components/settings/section-card";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Converts a URL-safe base64 VAPID key into the Uint8Array format the Push API expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // `new Uint8Array(length)` (as opposed to Uint8Array.from()) is typed by
  // modern lib.dom.d.ts as Uint8Array<ArrayBuffer> specifically, which is
  // what PushManager.subscribe()'s applicationServerKey (BufferSource) needs.
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

type SupportState = "checking" | "unsupported" | "supported";

/**
 * Push notification opt-in toggle. Self-contained: reads current
 * subscription state from the browser (not the server) on mount, so
 * it stays accurate even if the user cleared site data or revoked
 * permission outside of VAULTX.
 */
export function PushNotificationToggle() {
  const [support, setSupport]     = useState<SupportState>("checking");
  const [enabled, setEnabled]     = useState(false);
  const [pending, setPending]     = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!supported) {
      setSupport("unsupported");
      return;
    }
    setSupport("supported");

    navigator.serviceWorker.getRegistration("/").then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setEnabled(!!sub);
    });
  }, []);

  async function handleToggle(next: boolean) {
    if (!VAPID_PUBLIC_KEY) {
      toast.error("Push notifications aren't configured on this deployment yet.");
      return;
    }

    setPending(true);
    try {
      if (next) {
        await enablePush();
        toast.success("Push notifications enabled");
      } else {
        await disablePush();
        toast.success("Push notifications disabled");
      }
      setEnabled(next);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function enablePush() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was denied");
    }

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!res.ok) throw new Error("Failed to register subscription with the server");
  }

  async function disablePush() {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();

    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    } else {
      // No local subscription found — still clear any server-side
      // record in case this browser's state drifted from the DB.
      await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    }
  }

  if (support === "unsupported") {
    return (
      <div className="flex items-center gap-2 text-xs text-vault-muted">
        <BellOff className="w-3.5 h-3.5" />
        Not supported in this browser
      </div>
    );
  }

  return pending ? (
    <Loader2 className="w-4 h-4 animate-spin text-vault-muted" />
  ) : (
    <SettingsToggle
      checked={enabled}
      onChange={handleToggle}
      disabled={support === "checking"}
    />
  );
}

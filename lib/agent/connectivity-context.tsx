"use client";

/**
 * VAULT Copilot — Connectivity React Context Provider
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { checkActiveConnectivity } from "./connectivity";

export interface ConnectivityState {
  isOnline: boolean;
  lastCheckedAt: Date | null;
  recheckNow: () => Promise<boolean>;
}

const ConnectivityContext = createContext<ConnectivityState>({
  isOnline: true,
  lastCheckedAt: null,
  recheckNow: async () => true,
});

export function OnlineStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const recheckNow = useCallback(async (): Promise<boolean> => {
    const online = await checkActiveConnectivity();
    setIsOnline(online);
    setLastCheckedAt(new Date());
    return online;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    recheckNow();

    const handleBrowserOnline = () => {
      recheckNow();
    };

    const handleBrowserOffline = () => {
      setIsOnline(false);
      setLastCheckedAt(new Date());
    };

    window.addEventListener("online", handleBrowserOnline);
    window.addEventListener("offline", handleBrowserOffline);

    // Periodic heartbeat probe every 30 seconds
    const interval = setInterval(() => {
      recheckNow();
    }, 30000);

    return () => {
      window.removeEventListener("online", handleBrowserOnline);
      window.removeEventListener("offline", handleBrowserOffline);
      clearInterval(interval);
    };
  }, [recheckNow]);

  return (
    <ConnectivityContext.Provider value={{ isOnline, lastCheckedAt, recheckNow }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useOnlineStatus(): ConnectivityState {
  return useContext(ConnectivityContext);
}

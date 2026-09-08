"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { OnlineStatusProvider } from "@/lib/agent/connectivity-context";

/**
 * VAULTX is a dark-first security platform.
 * Also encapsulates OnlineStatusProvider and Service Worker registration.
 */
export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: string;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("ServiceWorker registration failed:", err);
      });
    }
  }, []);

  return (
    <OnlineStatusProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme={defaultTheme}
        enableSystem={defaultTheme === "system"}
        themes={["dark", "light", "system"]}
        disableTransitionOnChange={false}
      >
        {children}
      </NextThemesProvider>
    </OnlineStatusProvider>
  );
}

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { OnlineStatusProvider } from "@/lib/agent/connectivity-context";

/**
 * VAULTX is a dark-first security platform.
 */
export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: string;
}) {
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

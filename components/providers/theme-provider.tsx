"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * VAULTX is a dark-first security platform — the teal-on-black aesthetic
 * IS the brand. We still offer a light mode for accessibility/preference
 * reasons, but default to dark and don't follow system preference
 * automatically (a security dashboard should look consistent across
 * screenshots, demos, and screen-shares regardless of the user's OS theme).
 */
export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: string;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={defaultTheme === "system"}
      themes={["dark", "light", "system"]}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}

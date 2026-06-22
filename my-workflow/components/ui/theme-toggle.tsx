"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Deliberately placed in Settings rather than the global header.
 * VAULTX's dark aesthetic is core brand identity (see theme-provider.tsx) —
 * we don't want a header toggle encouraging casual switching that breaks
 * screenshot/demo consistency. Settings is the right amount of friction.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — next-themes needs a client mount to know theme
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="skeleton h-9 w-full rounded-lg" />;
  }

  return (
    <div className="flex items-center gap-2 bg-vault-elevated border border-vault-border rounded-lg p-1">
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          theme === "dark"
            ? "bg-vault-surface text-vault-text border border-vault-border"
            : "text-vault-muted hover:text-vault-text"
        )}
      >
        <Moon className="w-3.5 h-3.5" /> Dark
      </button>
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          theme === "light"
            ? "bg-vault-surface text-vault-text border border-vault-border"
            : "text-vault-muted hover:text-vault-text"
        )}
      >
        <Sun className="w-3.5 h-3.5" /> Light
      </button>
    </div>
  );
}

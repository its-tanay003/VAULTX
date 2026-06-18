"use client";

import { createContext, useContext } from "react";
import { useCommandPalette }         from "@/hooks/use-command-palette";
import { CommandPalette }            from "@/components/command/command-palette";
import type { UserRole }             from "@/lib/supabase/types";

const CommandPaletteContext = createContext<{ open: () => void } | null>(null);

export function useCommandPaletteContext() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPaletteContext must be used within CommandPaletteProvider");
  return ctx;
}

/**
 * Mounts globally inside the dashboard layout. Handles the ⌘K keyboard
 * listener and renders the modal. The Header's search button calls
 * useCommandPaletteContext().open() to trigger it manually too.
 */
export function CommandPaletteProvider({
  role, children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { open, setOpen } = useCommandPalette();

  return (
    <CommandPaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CommandPalette open={open} onClose={() => setOpen(false)} role={role} />
    </CommandPaletteContext.Provider>
  );
}

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useCommandPalette } from "@/hooks/use-command-palette";
import type { UserRole }     from "@/lib/supabase/types";

/**
 * UPDATED Week 8 (performance fix #1, see PERFORMANCE_AUDIT.md):
 *
 * CommandPalette pulls in framer-motion's AnimatePresence + motion.div
 * and does a live Supabase query on every keystroke. It's used by a
 * fraction of sessions (most people click nav links, not ⌘K) but was
 * previously bundled into every dashboard page's initial JS payload.
 *
 * next/dynamic with ssr: false defers fetching that code until needed.
 * IMPORTANT: once loaded, we keep it mounted (lazy-mount-once, not
 * mount-on-open/unmount-on-close) — CommandPalette's internal
 * AnimatePresence needs to stay in the tree to play its exit animation
 * when `open` flips back to false. Unmounting immediately on close
 * would skip that animation entirely.
 */
const CommandPalette = dynamic(
  () => import("@/components/command/command-palette").then((m) => m.CommandPalette),
  { ssr: false }
);

const CommandPaletteContext = createContext<{ open: () => void } | null>(null);

export function useCommandPaletteContext() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPaletteContext must be used within CommandPaletteProvider");
  return ctx;
}

export function CommandPaletteProvider({
  role, children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { open, setOpen } = useCommandPalette();
  const [hasLoaded, setHasLoaded] = useState(false);

  // First time `open` becomes true, flip hasLoaded permanently — this
  // triggers the dynamic import once and never unmounts afterward.
  useEffect(() => {
    if (open && !hasLoaded) setHasLoaded(true);
  }, [open, hasLoaded]);

  return (
    <CommandPaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      {hasLoaded && (
        <CommandPalette open={open} onClose={() => setOpen(false)} role={role} />
      )}
    </CommandPaletteContext.Provider>
  );
}

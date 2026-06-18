"use client";

import { useEffect, useState } from "react";

/**
 * Listens for ⌘K / Ctrl+K globally and manages command palette open state.
 * Mount once near the root of the dashboard layout.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMetaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isMetaK) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}

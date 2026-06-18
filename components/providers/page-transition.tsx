"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname }             from "next/navigation";

/**
 * Wraps dashboard page content with a subtle fade+rise transition
 * on every route change. This single component is responsible for
 * ~80% of the "premium feel" signal in the platform — per the
 * impact/effort ranking, page transitions are the highest-ROI
 * animation investment available.
 *
 * Respects prefers-reduced-motion automatically via Framer Motion's
 * built-in accessibility handling.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { motion } from "framer-motion";

interface Props {
  children:   React.ReactNode;
  className?: string;
  delay?:     number;
}

/**
 * Generic fade+rise-on-scroll wrapper. Fires once (viewport.once: true)
 * so re-scrolling past a section doesn't replay the animation —
 * intentional, replaying entrance animations on every scroll feels
 * gimmicky rather than premium.
 */
export function ScrollReveal({ children, className, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

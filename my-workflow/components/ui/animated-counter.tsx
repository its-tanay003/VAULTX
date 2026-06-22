"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface Props {
  value:      number;
  duration?:  number;
  prefix?:    string;
  suffix?:    string;
  decimals?:  number;
  className?: string;
}

/**
 * Animates a number counting up from 0 to its target value when it
 * scrolls into view. Used for dashboard stat cards — the single most
 * noticed "is this a real product" signal on first load.
 *
 * Pure CSS/JS via Framer Motion spring physics — no extra dependency.
 */
export function AnimatedCounter({
  value, duration = 1, prefix = "", suffix = "", decimals = 0, className,
}: Props) {
  const ref       = useRef<HTMLSpanElement>(null);
  const isInView  = useInView(ref, { once: true, margin: "-10px" });
  const motionVal = useMotionValue(0);
  const spring     = useSpring(motionVal, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    if (isInView) motionVal.set(value);
  }, [isInView, value]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${latest.toFixed(decimals)}${suffix}`;
      }
    });
    return unsubscribe;
  }, [spring, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}

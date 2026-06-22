"use client";

import { useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

const STATS = [
  { value: 99.2, suffix: "%",  decimals: 1, label: "Duplicate detection accuracy" },
  { value: 2,    suffix: "min",prefix: "<", decimals: 0, label: "Average AI triage time" },
  { value: 3,    suffix: "",   decimals: 0, label: "Stage validation pipeline" },
  { value: 4,    suffix: "",   decimals: 0, label: "Personas supported" },
];

function StatNumber({
  value, prefix = "", suffix = "", decimals = 0,
}: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref      = useRef<HTMLSpanElement>(null);
  const inView   = useInView(ref, { once: true, margin: "-10px" });
  const motionVal= useMotionValue(0);
  const spring   = useSpring(motionVal, { duration: 1200, bounce: 0 });

  useEffect(() => { if (inView) motionVal.set(value); }, [inView, value]);

  useEffect(() => {
    const unsub = spring.on("change", (latest) => {
      if (ref.current) ref.current.textContent = `${prefix}${latest.toFixed(decimals)}${suffix}`;
    });
    return unsub;
  }, [spring, prefix, suffix, decimals]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

export function AnimatedStatsBar() {
  return (
    <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      {STATS.map((s) => (
        <div key={s.label}>
          <div className="text-2xl font-semibold text-teal-gradient mb-1">
            <StatNumber value={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
          </div>
          <div className="text-xs text-vault-muted">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

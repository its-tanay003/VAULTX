"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn }    from "@/lib/utils";

interface Props {
  endsAt:   string;
  startsAt: string;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CountdownTimer({ endsAt, startsAt }: Props) {
  const [display, setDisplay] = useState("");
  const [label,   setLabel]   = useState("");
  const [urgent,  setUrgent]  = useState(false);

  useEffect(() => {
    function tick() {
      const now       = Date.now();
      const startMs   = new Date(startsAt).getTime();
      const endMs     = new Date(endsAt).getTime();

      if (now < startMs) {
        setLabel("Starts in");
        setDisplay(formatDuration(startMs - now));
        setUrgent(false);
      } else if (now < endMs) {
        const remaining = endMs - now;
        setLabel("Ends in");
        setDisplay(formatDuration(remaining));
        setUrgent(remaining < 3_600_000); // last hour = red
      } else {
        setLabel("Ended");
        setDisplay("00:00:00");
        setUrgent(false);
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, startsAt]);

  return (
    <div className="text-right">
      <p className="text-[10px] text-vault-muted uppercase tracking-wide flex items-center gap-1 justify-end">
        <Clock className="w-3 h-3" /> {label}
      </p>
      <p className={cn("text-lg font-mono font-semibold tabular-nums", urgent ? "text-red-400" : "text-vault-teal")}>
        {display}
      </p>
    </div>
  );
}

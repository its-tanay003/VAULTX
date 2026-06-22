"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { SeverityLevel } from "@/lib/supabase/types";

interface ProgramOption {
  id: string;
  name: string;
}

interface TriageFiltersProps {
  programs: ProgramOption[] | null;
  filterSeverity?: string;
  filterProgram?: string;
}

export function TriageFilters({
  programs,
  filterSeverity,
  filterProgram,
}: TriageFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <>
      {/* Severity filter */}
      <select
        aria-label="Filter by Severity"
        className="bg-vault-elevated border border-vault-border rounded-lg px-3 py-2 text-sm text-vault-muted focus:outline-none focus:border-vault-teal/50"
        value={filterSeverity ?? ""}
        onChange={(e) => handleFilterChange("severity", e.target.value)}
      >
        <option value="">All severities</option>
        {(["critical", "high", "medium", "low", "info"] as SeverityLevel[]).map((s) => (
          <option key={s} value={s} className="capitalize">
            {s}
          </option>
        ))}
      </select>

      {/* Program filter */}
      {programs && programs.length > 1 && (
        <select
          aria-label="Filter by Program"
          className="bg-vault-elevated border border-vault-border rounded-lg px-3 py-2 text-sm text-vault-muted focus:outline-none focus:border-vault-teal/50"
          value={filterProgram ?? ""}
          onChange={(e) => handleFilterChange("program", e.target.value)}
        >
          <option value="">All programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </>
  );
}

"use client";

import { useTransition } from "react";
import { requestTestPlan } from "@/app/actions/ptaas";
import { toast } from "sonner";
import { Sparkles, Loader2, ListChecks } from "lucide-react";
import type { TestPlan } from "@/lib/ai/pentest";

interface Props {
  engagementId: string;
  testPlan:     TestPlan | null;
  canGenerate:  boolean;
}

export function TestPlanPanel({ engagementId, testPlan, canGenerate }: Props) {
  const [pending, start] = useTransition();

  function handleGenerate() {
    start(async () => {
      try {
        await requestTestPlan(engagementId);
        toast.success("Test plan generated");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to generate test plan");
      }
    });
  }

  return (
    <div className="vault-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-vault-teal" /> Test Plan
        </h2>
        {canGenerate && (
          <button
            onClick={handleGenerate}
            disabled={pending}
            className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {pending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Sparkles className="w-3.5 h-3.5" />}
            {testPlan ? "Regenerate" : "Generate with AI"}
          </button>
        )}
      </div>

      {!testPlan ? (
        <p className="text-sm text-vault-muted text-center py-6">
          No test plan yet — generate one from the engagement scope
        </p>
      ) : (
        <div className="space-y-4">
          {testPlan.phases.map((phase, i) => (
            <div key={i}>
              <p className="text-xs font-medium text-vault-teal mb-1.5">
                Phase {i + 1}: {phase.title}
              </p>
              <ul className="space-y-1">
                {phase.tasks.map((task, j) => (
                  <li key={j} className="text-xs text-vault-muted flex items-start gap-1.5">
                    <span className="text-vault-teal mt-0.5">·</span>
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

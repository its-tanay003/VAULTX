import { Brain } from "lucide-react";

interface Props {
  trace: { step: number; thought: string }[];
}

/**
 * Surfaces the AI's actual reasoning process, not just its conclusions —
 * the "full reasoning trace per finding" promise from the original
 * roadmap copy. Builds trust: a triager can see WHY the AI flagged
 * something, not just a severity label with no explanation.
 */
export function ReasoningTrace({ trace }: Props) {
  if (!trace || trace.length === 0) return null;

  return (
    <div className="vault-card p-5">
      <h2 className="text-sm font-medium flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-vault-teal" /> AI Reasoning Trace
      </h2>
      <div className="space-y-3">
        {trace.map((step) => (
          <div key={step.step} className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-vault-teal/10 border border-vault-teal/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-medium text-vault-teal">{step.step}</span>
            </div>
            <p className="text-xs text-vault-muted leading-relaxed pt-0.5">{step.thought}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { requestReport } from "@/app/actions/ptaas";
import { toast } from "sonner";
import { FileText, Sparkles, Loader2, CheckCircle2 } from "lucide-react";

interface Report {
  executive_summary: string;
  full_report: {
    sections: { title: string; content: string }[];
    findings_summary: Record<string, number>;
    recommendations: string[];
  };
  generated_at: string;
}

interface Props {
  engagementId: string;
  report:       Report | null;
  canGenerate:  boolean;
  hasFindings:  boolean;
}

export function ReportPanel({ engagementId, report, canGenerate, hasFindings }: Props) {
  const [pending, start] = useTransition();

  function handleGenerate() {
    start(async () => {
      try {
        await requestReport(engagementId);
        toast.success("Report generated");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to generate report");
      }
    });
  }

  return (
    <div className="vault-card p-5">
      <h2 className="text-sm font-medium flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-vault-teal" /> Final Report
      </h2>

      {!report ? (
        <div className="text-center py-4">
          <p className="text-xs text-vault-muted mb-3">
            {hasFindings
              ? "Generate an AI-compiled report from the logged findings"
              : "No findings yet — report can be generated once findings exist"}
          </p>
          {canGenerate && (
            <button
              onClick={handleGenerate}
              disabled={pending}
              className="btn-teal w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {pending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Sparkles className="w-4 h-4" />}
              Generate Report
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Generated {new Date(report.generated_at).toLocaleDateString()}
          </div>

          <div>
            <p className="text-xs font-medium text-vault-teal mb-1.5">Executive Summary</p>
            <p className="text-xs text-vault-muted leading-relaxed">{report.executive_summary}</p>
          </div>

          {report.full_report.sections?.map((s, i) => (
            <div key={i}>
              <p className="text-xs font-medium text-vault-teal mb-1.5">{s.title}</p>
              <p className="text-xs text-vault-muted leading-relaxed">{s.content}</p>
            </div>
          ))}

          {report.full_report.recommendations?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-vault-teal mb-1.5">Recommendations</p>
              <ul className="space-y-1">
                {report.full_report.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-vault-muted flex items-start gap-1.5">
                    <span className="text-vault-teal mt-0.5">·</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canGenerate && (
            <button
              onClick={handleGenerate}
              disabled={pending}
              className="btn-ghost w-full text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  );
}

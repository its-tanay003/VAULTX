"use client";

import { useState, useRef, useTransition } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "sonner";
import {
  Download, Save, Trash2, Link2, Loader2, AlertTriangle, TrendingUp, Clock,
} from "lucide-react";
import {
  computeReport, saveReportTemplate, deleteReportTemplate, toggleReportEmbed,
  type ReportConfig, type MetricKey,
} from "@/app/actions/reports";
import { createSchedule } from "@/app/actions/scheduled-reports";
import { exportMetricAsCsv, exportChartAsPng } from "@/lib/reports/export";

const METRIC_OPTIONS: { key: MetricKey; label: string; kind: "series" | "table" | "single" }[] = [
  { key: "bugs_submitted",         label: "Bugs Submitted",        kind: "series" },
  { key: "bugs_resolved",          label: "Bugs Resolved",         kind: "series" },
  { key: "severity_distribution",  label: "Severity Distribution", kind: "series" },
  { key: "payout_totals",          label: "Payout Totals",         kind: "series" },
  { key: "avg_response_time",      label: "Avg Response Time",     kind: "single" },
  { key: "researcher_activity",    label: "Researcher Activity",   kind: "series" },
  { key: "researcher_leaderboard", label: "Researcher Leaderboard",kind: "table" },
  { key: "program_roi",            label: "Program Cost/Finding",  kind: "series" },
  { key: "sla_compliance",         label: "SLA Compliance",        kind: "table" },
];

const DATE_PRESETS = [
  { label: "Today",  days: 0 },
  { label: "7d",      days: 7 },
  { label: "30d",     days: 30 },
  { label: "90d",     days: 90 },
];

const COLORS = ["#2dd4bf", "#60a5fa", "#f59e0b", "#ef4444", "#a78bfa", "#34d399"];

interface Template {
  id: string; name: string; config: ReportConfig; is_embeddable: boolean; embed_token: string | null; created_at: string;
}

interface Props {
  programs:    { id: string; name: string }[];
  researchers: { id: string; full_name: string | null; username: string | null }[];
  initialTemplates: Template[];
}

function dateNDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function ReportBuilder({ programs, researchers, initialTemplates }: Props) {
  const [metrics, setMetrics]   = useState<MetricKey[]>(["bugs_submitted", "severity_distribution"]);
  const [chartType, setChartType] = useState<ReportConfig["chartType"]>("bar");
  const [dateFrom, setDateFrom] = useState(dateNDaysAgo(30));
  const [dateTo, setDateTo]     = useState(dateNDaysAgo(0));
  const [severities, setSeverities] = useState<string[]>([]);
  const [statuses, setStatuses]     = useState<string[]>([]);
  const [researcherId, setResearcherId] = useState("");
  const [programId, setProgramId]       = useState("");
  const [comparisonMode, setComparisonMode] = useState(false);

  const [results, setResults]     = useState<Record<string, unknown> | null>(null);
  const [anomalies, setAnomalies] = useState<Record<string, { label: string; value: number; isAnomaly: boolean; deviation: number }[]>>({});
  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [pending, start] = useTransition();
  const [templates, setTemplates] = useState(initialTemplates);
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function buildConfig(): ReportConfig {
    return {
      metrics, chartType,
      filters: {
        dateFrom, dateTo,
        severities: severities.length ? severities : undefined,
        statuses: statuses.length ? statuses : undefined,
        researcherId: researcherId || undefined,
        programId: programId || undefined,
      },
      comparisonMode,
      comparisonDateFrom: comparisonMode ? dateNDaysAgo(60) : undefined,
      comparisonDateTo:   comparisonMode ? dateNDaysAgo(30) : undefined,
    };
  }

  function runReport() {
    start(async () => {
      try {
        const { results, anomalies, comparison } = await computeReport(buildConfig());
        setResults(results);
        setAnomalies(anomalies as any);
        setComparison(comparison);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to compute report");
      }
    });
  }

  function toggleMetric(key: MetricKey) {
    setMetrics((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]));
  }

  async function handleSaveTemplate() {
    const name = window.prompt("Name this report template:");
    if (!name) return;
    try {
      await saveReportTemplate(name, buildConfig());
      toast.success("Template saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    }
  }

  async function handleDeleteTemplate(id: string) {
    try {
      await deleteReportTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
    }
  }

  async function handleSchedule(templateId: string) {
    const frequency = window.prompt('Schedule frequency: type "weekly" or "monthly"', "weekly");
    if (frequency !== "weekly" && frequency !== "monthly") return;
    const emailsRaw = window.prompt("Recipient email(s), comma-separated:");
    if (!emailsRaw) return;
    const emails = emailsRaw.split(",").map((e) => e.trim()).filter(Boolean);

    try {
      await createSchedule(templateId, frequency, emails);
      toast.success(`Scheduled ${frequency} report to ${emails.length} recipient(s)`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule report");
    }
  }

  async function handleToggleEmbed(template: Template) {
    try {
      const { embedToken } = await toggleReportEmbed(template.id, !template.is_embeddable);
      setTemplates((prev) => prev.map((t) => t.id === template.id ? { ...t, is_embeddable: !t.is_embeddable, embed_token: embedToken ?? t.embed_token } : t));
      if (embedToken) {
        const url = `${window.location.origin}/r/${embedToken}`;
        await navigator.clipboard.writeText(url);
        toast.success("Embed link copied to clipboard");
      } else {
        toast.success("Embed access disabled");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle embed");
    }
  }

  function renderChart(key: MetricKey, data: { label: string; value: number }[]) {
    const dataWithAnomalies = anomalies[key] ?? data.map((d) => ({ ...d, isAnomaly: false }));

    if (chartType === "pie") {
      return (
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
        </PieChart>
      );
    }
    if (chartType === "line") {
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
          <Line type="monotone" dataKey="value" stroke="#2dd4bf" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      );
    }
    // bar (default) and scatter fall back to bar since most metrics here
    // are label/value pairs, not true x/y numeric pairs scatter needs
    return (
      <BarChart data={dataWithAnomalies}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
        <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
        <Bar dataKey="value">
          {dataWithAnomalies.map((d, i) => (
            <Cell key={i} fill={(d as any).isAnomaly ? "#ef4444" : "#2dd4bf"} />
          ))}
        </Bar>
      </BarChart>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
      {/* Config panel */}
      <div className="space-y-4">
        <div className="vault-card p-4 space-y-2">
          <p className="text-xs font-medium text-vault-muted uppercase tracking-wide">Quick Presets</p>
          <button onClick={() => { setMetrics(["bugs_submitted", "severity_distribution", "payout_totals", "avg_response_time"]); setChartType("bar"); }} className="btn-ghost w-full text-xs justify-start">
            Executive Summary
          </button>
          <button onClick={() => setMetrics(["researcher_leaderboard"])} className="btn-ghost w-full text-xs justify-start">
            Researcher Leaderboard
          </button>
          <button onClick={() => setMetrics(["sla_compliance"])} className="btn-ghost w-full text-xs justify-start">
            SLA Compliance
          </button>
        </div>

        <div className="vault-card p-4 space-y-3">
          <p className="text-xs font-medium text-vault-muted uppercase tracking-wide">Metrics</p>
          {METRIC_OPTIONS.map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={metrics.includes(m.key)} onChange={() => toggleMetric(m.key)} className="accent-teal-500" />
              {m.label}
            </label>
          ))}
        </div>

        <div className="vault-card p-4 space-y-3">
          <p className="text-xs font-medium text-vault-muted uppercase tracking-wide">Chart Type</p>
          <select value={chartType} onChange={(e) => setChartType(e.target.value as any)} className="vault-input w-full text-sm">
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
            <option value="scatter">Scatter (falls back to bar for label/value data)</option>
          </select>
        </div>

        <div className="vault-card p-4 space-y-3">
          <p className="text-xs font-medium text-vault-muted uppercase tracking-wide">Date Range</p>
          <div className="flex gap-1.5 flex-wrap">
            {DATE_PRESETS.map((p) => (
              <button key={p.label} onClick={() => setDateFrom(dateNDaysAgo(p.days))} className="btn-ghost text-xs px-2 py-1">
                {p.label}
              </button>
            ))}
          </div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="vault-input w-full text-sm" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="vault-input w-full text-sm" />
        </div>

        <div className="vault-card p-4 space-y-3">
          <p className="text-xs font-medium text-vault-muted uppercase tracking-wide">Filters</p>
          <select multiple value={severities} onChange={(e) => setSeverities(Array.from(e.target.selectedOptions, (o) => o.value))} className="vault-input w-full text-sm h-20">
            {["critical", "high", "medium", "low", "info"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="vault-input w-full text-sm">
            <option value="">All programs</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={researcherId} onChange={(e) => setResearcherId(e.target.value)} className="vault-input w-full text-sm">
            <option value="">All researchers</option>
            {researchers.map((r) => <option key={r.id} value={r.id}>{r.full_name ?? r.username}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={comparisonMode} onChange={(e) => setComparisonMode(e.target.checked)} className="accent-teal-500" />
            Compare vs. prior period
          </label>
        </div>

        <button onClick={runReport} disabled={pending || metrics.length === 0} className="btn-teal w-full flex items-center justify-center gap-2 text-sm">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          Run Report
        </button>
        {results && (
          <button onClick={handleSaveTemplate} className="btn-ghost w-full flex items-center justify-center gap-2 text-xs">
            <Save className="w-3.5 h-3.5" /> Save as Template
          </button>
        )}
      </div>

      {/* Results */}
      <div className="space-y-5">
        {!results && (
          <div className="vault-card flex flex-col items-center justify-center py-24 text-center text-vault-muted">
            <TrendingUp className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm">Pick metrics and click Run Report</p>
          </div>
        )}

        {results && Object.entries(results).map(([key, value]) => {
          const meta = METRIC_OPTIONS.find((m) => m.key === key);
          const flaggedCount = anomalies[key]?.filter((a) => a.isAnomaly).length ?? 0;

          if (meta?.kind === "single") {
            const single = value as { label: string; value: number };
            return (
              <div key={key} className="vault-card p-5">
                <p className="text-xs text-vault-muted">{single.label}</p>
                <p className="text-3xl font-semibold text-vault-teal mt-1">{single.value}</p>
              </div>
            );
          }

          if (meta?.kind === "table") {
            const rows = value as Record<string, unknown>[];
            return (
              <div key={key} className="vault-card p-4">
                <p className="text-sm font-medium mb-3">{meta.label}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-vault-muted text-left">
                      {rows[0] && Object.keys(rows[0]).map((k) => <th key={k} className="pb-2 pr-4 capitalize">{k.replace(/_/g, " ")}</th>)}
                    </tr></thead>
                    <tbody>
                      {rows.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-t border-vault-border">
                          {Object.entries(row).map(([k, v]) => (
                            <td key={k} className={`py-1.5 pr-4 ${k === "breached" && v ? "text-red-400" : ""}`}>
                              {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          const series = value as { label: string; value: number }[];
          return (
            <div key={key} className="vault-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{meta?.label ?? key}</p>
                  {flaggedCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 border border-amber-900/40 rounded px-1.5 py-0.5">
                      <AlertTriangle className="w-3 h-3" /> {flaggedCount} anomal{flaggedCount === 1 ? "y" : "ies"}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => exportMetricAsCsv(key, series)} className="btn-ghost text-[10px] px-2 py-1 flex items-center gap-1">
                    <Download className="w-3 h-3" /> CSV
                  </button>
                  <button onClick={() => chartRefs.current[key] && exportChartAsPng(chartRefs.current[key]!, key)} className="btn-ghost text-[10px] px-2 py-1 flex items-center gap-1">
                    <Download className="w-3 h-3" /> PNG
                  </button>
                </div>
              </div>
              <div ref={(el) => { chartRefs.current[key] = el; }} style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>{renderChart(key as MetricKey, series)}</ResponsiveContainer>
              </div>
              {comparison?.[key] && (
                <div className="mt-2 pt-2 border-t border-vault-border">
                  <p className="text-[10px] text-vault-muted mb-1">Prior period</p>
                  <div style={{ width: "100%", height: 140 }}>
                    <ResponsiveContainer>{renderChart(key as MetricKey, comparison[key] as any)}</ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {templates.length > 0 && (
          <div className="vault-card p-4">
            <p className="text-sm font-medium mb-3">Saved Templates</p>
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm py-1.5">
                  <span>{t.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSchedule(t.id)} className="text-vault-muted hover:text-vault-teal" title="Schedule recurring delivery">
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggleEmbed(t)} className="text-vault-muted hover:text-vault-teal" title="Toggle public embed link">
                      <Link2 className={`w-3.5 h-3.5 ${t.is_embeddable ? "text-vault-teal" : ""}`} />
                    </button>
                    <button onClick={() => handleDeleteTemplate(t.id)} className="text-vault-muted hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#2dd4bf", "#60a5fa", "#f59e0b", "#ef4444", "#a78bfa"];

const LABELS: Record<string, string> = {
  bugs_submitted: "Bugs Submitted", bugs_resolved: "Bugs Resolved",
  severity_distribution: "Severity Distribution", payout_totals: "Payout Totals",
};

export function EmbedChart({ metricKey, data, chartType }: {
  metricKey: string; data: { label: string; value: number }[]; chartType: "bar" | "line" | "pie" | "scatter";
}) {
  return (
    <div className="vault-card p-4">
      <p className="text-sm font-medium mb-3">{LABELS[metricKey] ?? metricKey}</p>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          {chartType === "pie" ? (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
            </PieChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
              <Line type="monotone" dataKey="value" stroke="#2dd4bf" strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
              <Bar dataKey="value" fill="#2dd4bf" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";

const EmbedChart = dynamic(
  () => import("@/components/reports/embed-chart").then((mod) => mod.EmbedChart),
  { ssr: false }
);

export function EmbedChartWrapper(props: { metricKey: string; data: { label: string; value: number }[]; chartType: "line" | "bar" | "pie" | "scatter" }) {
  return <EmbedChart {...props} />;
}

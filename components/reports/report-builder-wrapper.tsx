"use client";

import dynamic from "next/dynamic";

export const ReportBuilderWrapper = dynamic(
  () => import("@/components/reports/report-builder").then((mod) => mod.ReportBuilder),
  { ssr: false }
);

"use client";

/** Downloads a time-series/category metric as a CSV file, client-side, no dependency needed. */
export function exportMetricAsCsv(metricName: string, data: { label: string; value: number }[]) {
  const rows = [["label", "value"], ...data.map((d) => [d.label, String(d.value)])];
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${metricName}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Exports a rendered chart as a PNG by serializing its SVG element to a
 * canvas — recharts renders pure SVG, so this needs no extra library.
 */
export function exportChartAsPng(containerEl: HTMLElement, filename: string) {
  const svg = containerEl.querySelector("svg");
  if (!svg) {
    console.error("[Report Export] No SVG element found in chart container");
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const bbox = svg.getBoundingClientRect();
    canvas.width = bbox.width * 2;
    canvas.height = bbox.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0a0a0a"; // matches the dashboard's dark background rather than a blank export
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(pngUrl);
    });
  };
  img.src = url;
}

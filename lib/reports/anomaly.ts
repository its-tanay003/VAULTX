/**
 * VAULTX Report Anomaly Detection
 *
 * Deliberately simple: flags points more than 2 standard deviations
 * from the series mean. This is a real, explainable statistical
 * signal — not a machine-learning model — appropriate for a reporting
 * feature where a human needs to understand *why* something was
 * flagged, not just that it was.
 */

export interface AnomalyPoint {
  label: string;
  value: number;
  isAnomaly: boolean;
  deviation: number; // number of std deviations from the mean
}

export function detectAnomalies(series: { label: string; value: number }[]): AnomalyPoint[] {
  if (series.length < 4) {
    // Not enough points for a meaningful stddev — nothing to flag.
    return series.map((p) => ({ ...p, isAnomaly: false, deviation: 0 }));
  }

  const values = series.map((p) => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return series.map((p) => ({ ...p, isAnomaly: false, deviation: 0 }));

  return series.map((p) => {
    const deviation = (p.value - mean) / stddev;
    return { ...p, isAnomaly: Math.abs(deviation) > 2, deviation: Math.round(deviation * 10) / 10 };
  });
}

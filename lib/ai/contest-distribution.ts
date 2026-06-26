/**
 * VAULTX Audit Contest Pool Distribution Engine
 *
 * Implements the standard Code4rena-style distribution formula:
 *
 *   severity_weights = { critical:10, high:5, medium:2, low:0.5, info:0 }
 *
 *   For each valid finding:
 *     duplicate_group = all valid findings with same duplicate_of root
 *     shares = severity_weight / duplicate_count_in_group
 *
 *   For each auditor finding:
 *     payout = (finding_shares / total_shares_all_findings) * pool_amount
 *
 * Why divide by duplicate count (not exclude duplicates):
 *   This is the core mechanic that differentiates audit contests from
 *   bug bounty. If three auditors independently find the same critical
 *   bug, all three contributed value — excluding two of them would
 *   disincentivize submitting findings you're not certain are unique.
 *   Splitting the reward maintains incentive to submit while fairly
 *   distributing credit proportionally.
 *
 * Minimum payout threshold:
 *   Info-severity findings get shares=0 and therefore payout=$0.
 *   This is intentional — info/QA findings in a security audit contest
 *   aren't compensated, same as Code4rena's model.
 */

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 10,
  high:     5,
  medium:   2,
  low:      0.5,
  info:     0,
};

export interface FindingForDistribution {
  id:               string;
  auditor_id:       string;
  severity:         string;
  confirmed_severity: string | null;
  status:           string;
  duplicate_of:     string | null;
}

export interface PayoutCalculation {
  findingId:    string;
  auditorId:    string;
  shares:       number;
  payoutAmount: number;
}

export function calculatePayouts(
  findings:   FindingForDistribution[],
  poolAmount: number
): PayoutCalculation[] {
  // Only valid findings participate in distribution
  const valid = findings.filter((f) => f.status === "valid");
  if (valid.length === 0) return [];

  // Resolve each finding to its root (for duplicate groups)
  // A finding is its own root if duplicate_of is null
  // A duplicate finding's root is its duplicate_of (or that finding's root, recursively)
  const rootMap = new Map<string, string>();
  function getRoot(id: string): string {
    const finding = valid.find((f) => f.id === id);
    if (!finding || !finding.duplicate_of) return id;
    const root = getRoot(finding.duplicate_of);
    rootMap.set(id, root);
    return root;
  }
  valid.forEach((f) => getRoot(f.id));

  // Count how many valid findings share each root (duplicate group size)
  const groupSizes = new Map<string, number>();
  valid.forEach((f) => {
    const root = getRoot(f.id);
    groupSizes.set(root, (groupSizes.get(root) ?? 0) + 1);
  });

  // Calculate shares per finding
  const sharesPerFinding = valid.map((f) => {
    const severity = (f.confirmed_severity ?? f.severity) as keyof typeof SEVERITY_WEIGHTS;
    const weight   = SEVERITY_WEIGHTS[severity] ?? 0;
    const root     = getRoot(f.id);
    const groupSize = groupSizes.get(root) ?? 1;
    const shares   = weight / groupSize;
    return { finding: f, shares };
  });

  const totalShares = sharesPerFinding.reduce((sum, { shares }) => sum + shares, 0);

  if (totalShares === 0) {
    // All valid findings are info — no distribution
    return valid.map((f) => ({
      findingId:    f.id,
      auditorId:    f.auditor_id,
      shares:       0,
      payoutAmount: 0,
    }));
  }

  return sharesPerFinding.map(({ finding, shares }) => ({
    findingId:    finding.id,
    auditorId:    finding.auditor_id,
    shares:       Math.round(shares * 10000) / 10000,
    payoutAmount: Math.round((shares / totalShares) * poolAmount * 100) / 100,
  }));
}

/* ─── Summary helpers for display ─────────────────────────────────────────── */

export interface ContestStats {
  totalFindings:     number;
  validFindings:     number;
  invalidFindings:   number;
  duplicateFindings: number;
  uniqueAuditors:    number;
  bySeverity: Record<string, number>;
}

export function computeContestStats(
  findings: Pick<FindingForDistribution, "status" | "severity" | "auditor_id">[]
): ContestStats {
  const bySeverity: Record<string, number> = {};
  const auditors = new Set<string>();

  for (const f of findings) {
    auditors.add(f.auditor_id);
    if (f.status === "valid") {
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    }
  }

  return {
    totalFindings:     findings.length,
    validFindings:     findings.filter((f) => f.status === "valid").length,
    invalidFindings:   findings.filter((f) => f.status === "invalid").length,
    duplicateFindings: findings.filter((f) => f.status === "duplicate").length,
    uniqueAuditors:    auditors.size,
    bySeverity,
  };
}

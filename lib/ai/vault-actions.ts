/**
 * VAULT Agent Mode — Action Registry
 *
 * This is the "Action Validation Layer" + "Execution layer" from the
 * design doc (vault-agent-mode-design.md §6.2, §10), combined into one
 * module for this first slice. Every executor here is a thin wrapper
 * around a server action that already exists and is already correctly
 * permission-checked — this file adds no new authorization logic of
 * its own beyond "is this action type even offered to this role,"
 * which is a UX allow-list, not a security boundary. The real
 * boundary is still the wrapped function's own auth check (RLS,
 * ownership checks, etc.) — unchanged, untouched, called exactly as
 * a human clicking the equivalent button would call it.
 *
 * First-slice action set (3 actions), matching the design doc's
 * recommendation to prove the plumbing before expanding the allow-list:
 *   - trigger_code_scan     (wraps app/actions/code-quality.ts runScan)
 *   - trigger_web3_audit    (wraps app/actions/code-quality.ts runWeb3Audit)
 *   - generate_ptaas_report (wraps lib/ptaas/report-generation.ts)
 *
 * Deliberately absent, permanently, not just "not yet built": any
 * reward action, any credential/settings action, anything cross-org.
 * See the design doc §4.1 for why these are exclusions by omission,
 * not a permission tier that could be misconfigured open.
 */

import { runScan, runWeb3Audit } from "@/app/actions/code-quality";
import { generateEngagementReportPdf } from "@/lib/ptaas/report-generation";
import type { UserRole } from "@/lib/supabase/types";

export type ActionType = "trigger_code_scan" | "trigger_web3_audit" | "generate_ptaas_report";

export interface ActionDefinition {
  type: ActionType;
  allowedRoles: UserRole[];
  paramSchema: Record<string, "string">;
  describe: (params: Record<string, string>) => string;
}

export const ACTION_REGISTRY: Record<ActionType, ActionDefinition> = {
  trigger_code_scan: {
    type: "trigger_code_scan",
    allowedRoles: ["triager", "admin", "org"],
    paramSchema: { repoId: "string" },
    describe: () => "Run a code quality scan on this connected repository.",
  },
  trigger_web3_audit: {
    type: "trigger_web3_audit",
    allowedRoles: ["triager", "admin", "org"],
    paramSchema: { repoId: "string" },
    describe: () => "Run a Web3/Solidity smart contract audit on this connected repository.",
  },
  generate_ptaas_report: {
    type: "generate_ptaas_report",
    allowedRoles: ["admin", "org", "triager"],
    paramSchema: { engagementId: "string" },
    describe: () => "Generate the signed PDF pentest report for this engagement.",
  },
};

/**
 * Validates a proposed action's shape and the confirming user's role
 * against the registry. Returns null (silently rejected, per the
 * design doc §6.2 — the user sees a normal chat answer, not a
 * malformed action card) if anything doesn't check out.
 */
export function validateProposedAction(
  role: UserRole,
  actionType: string,
  params: Record<string, unknown>
): { type: ActionType; params: Record<string, string>; summary: string } | null {
  const def = ACTION_REGISTRY[actionType as ActionType];
  if (!def) return null;
  if (!def.allowedRoles.includes(role)) return null;

  const cleanParams: Record<string, string> = {};
  for (const [key, expectedType] of Object.entries(def.paramSchema)) {
    const value = params[key];
    if (expectedType === "string" && typeof value !== "string") return null;
    if (typeof value === "string" && value.length === 0) return null;
    cleanParams[key] = value as string;
  }

  return { type: def.type, params: cleanParams, summary: def.describe(cleanParams) };
}

export interface ExecutionResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * Executes a validated action. Each branch calls the exact existing
 * server action/function a human clicking the equivalent button
 * would call — no separate logic path for VAULT.
 */
export async function executeAction(type: ActionType, params: Record<string, string>): Promise<ExecutionResult> {
  try {
    switch (type) {
      case "trigger_code_scan": {
        await runScan(params.repoId);
        return { success: true, result: { repoId: params.repoId, message: "Scan started" } };
      }
      case "trigger_web3_audit": {
        await runWeb3Audit(params.repoId);
        return { success: true, result: { repoId: params.repoId, message: "Audit started" } };
      }
      case "generate_ptaas_report": {
        const { filename, sha256 } = await generateEngagementReportPdf(params.engagementId);
        return { success: true, result: { filename, sha256, downloadUrl: `/api/ptaas/${params.engagementId}/report-pdf` } };
      }
      default:
        return { success: false, error: "Unknown action type" };
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error during execution" };
  }
}

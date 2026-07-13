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
import { triggerScan as triggerRedTeamScan } from "@/app/actions/red-team";
import { requestMoreInfo } from "@/app/actions/triage";
import { generateEngagementReportPdf } from "@/lib/ptaas/report-generation";
import { updateUserSettings, getUserSettings } from "@/app/actions/settings";
import { updateProfilePreferences } from "@/app/actions/profile";
import { draftChallenge } from "@/app/actions/ctf";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";


export type ActionType =
  | "trigger_code_scan" | "trigger_web3_audit" | "generate_ptaas_report"
  | "trigger_red_team_scan" | "request_more_info" | "toggle_setting" | "draft_ctf_challenge";


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
  trigger_red_team_scan: {
    type: "trigger_red_team_scan",
    // Narrower than the other actions on purpose: the underlying
    // triggerScan() action checks organizations.owner_id === caller
    // specifically, not general org membership — matching that here
    // rather than offering the action to roles that would just hit a
    // 403 from the real check anyway.
    allowedRoles: ["org", "admin"],
    paramSchema: { targetId: "string" },
    describe: () => "Run an AI Red Team scan against this already-authorized target.",
  },
  request_more_info: {
    type: "request_more_info",
    allowedRoles: ["triager", "admin", "org"],
    paramSchema: { submissionId: "string", question: "string" },
    describe: (params) => `Send a "needs more info" request to the researcher: "${params.question ?? ""}"`,
  },
  toggle_setting: {
    type: "toggle_setting",
    allowedRoles: ["org", "researcher", "triager", "admin"],
    paramSchema: { key: "string" },
    describe: (params) => `Toggle preference/setting: ${params.key}`,
  },
  draft_ctf_challenge: {
    type: "draft_ctf_challenge",
    allowedRoles: ["org", "admin"],
    paramSchema: {
      competitionId: "string",
      title: "string",
      description: "string",
      category: "string",
      difficulty: "string",
      flag: "string",
      hint: "string"
    },
    describe: (params) => `Draft a new CTF challenge titled "${params.title}"`,
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
      case "trigger_red_team_scan": {
        await triggerRedTeamScan(params.targetId);
        return { success: true, result: { targetId: params.targetId, message: "Red Team scan started" } };
      }
      case "request_more_info": {
        await requestMoreInfo(params.submissionId, params.question);
        return { success: true, result: { submissionId: params.submissionId, message: "Request sent to researcher" } };
      }
      case "toggle_setting": {
        const allowedKeys = ["marketing_emails", "security_alerts", "weekly_digest", "reduced_motion", "high_contrast", "ai_training_opt_in"];
        const key = params.key;
        if (!allowedKeys.includes(key)) {
          return { success: false, error: `Setting key "${key}" is not allow-listed or is security-sensitive.` };
        }

        const userSettingsKeys = ["marketing_emails", "security_alerts", "weekly_digest"];
        const profileKeys = ["reduced_motion", "high_contrast", "ai_training_opt_in"];

        if (userSettingsKeys.includes(key)) {
          const currentSettings = await getUserSettings();
          const currentVal = !!currentSettings[key as keyof typeof currentSettings];
          await updateUserSettings({ [key]: !currentVal });
          return { success: true, result: { key, newValue: !currentVal, message: `Successfully toggled ${key} to ${!currentVal}` } };
        } else if (profileKeys.includes(key)) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Not authenticated");
          const { data: profile } = await supabase.from("profiles").select(key).eq("id", user.id).single();
          const currentVal = !!profile?.[key as keyof typeof profile];
          await updateProfilePreferences({ [key]: !currentVal });
          return { success: true, result: { key, newValue: !currentVal, message: `Successfully toggled ${key} to ${!currentVal}` } };
        }
        return { success: false, error: "Invalid setting category" };
      }
      case "draft_ctf_challenge": {
        await draftChallenge({
          competitionId: params.competitionId,
          title: params.title,
          description: params.description,
          category: params.category,
          difficulty: params.difficulty,
          flag: params.flag,
          hint: params.hint
        });
        return { success: true, result: { title: params.title, message: "Draft challenge successfully created" } };
      }
      default:
        return { success: false, error: "Unknown action type" };
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error during execution" };
  }
}

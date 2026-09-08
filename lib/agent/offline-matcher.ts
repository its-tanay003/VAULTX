/**
 * VAULT Copilot — Client-Side Offline Intent Matcher & Local KB Engine
 *
 * Runs completely client-side with zero external network or model requests.
 * Answers navigation and informational questions from cached local knowledge base,
 * and identifies write actions to queue safely for online sync.
 */

import {
  CAPABILITY_REGISTRY,
  getCapabilityByKey,
  type UserRbacRole,
  type Capability,
} from "./capability-registry";
import { SEED_LOCAL_KB_DOCS, type LocalKbDoc } from "./offline-db";

export interface OfflineMatchResult {
  kind: "navigation" | "explanation" | "queued_action" | "unsupported";
  textResponse: string;
  targetRoute?: string;
  matchedCapability?: Capability;
  queuedAction?: {
    actionType: string;
    capabilityKey: string;
    params: Record<string, string>;
    summary: string;
  };
}

export function matchOfflineQuery(query: string, userRole: UserRbacRole = "guest"): OfflineMatchResult {
  const normalized = query.toLowerCase().trim();

  // 1. Check for Action Triggers (e.g. trigger scan, toggle setting, draft ctf)
  if (normalized.includes("scan") || normalized.includes("audit") || normalized.includes("run")) {
    if (normalized.includes("red team") || normalized.includes("adversarial")) {
      const cap = getCapabilityByKey("action.trigger_red_team_scan");
      return {
        kind: "queued_action",
        textResponse: "⚡ **Offline Notice**: AI Red Team scans require cloud connection and cannot run offline. I have saved this request to your pending queue and will prompt for confirmation once your connection is restored.",
        matchedCapability: cap,
        queuedAction: {
          actionType: "trigger_red_team_scan",
          capabilityKey: "action.trigger_red_team_scan",
          params: { targetId: "pending-target-id" },
          summary: "Launch AI Red Team Scan (Queued Offline)",
        },
      };
    }

    if (normalized.includes("code") || normalized.includes("repo") || normalized.includes("sast")) {
      const cap = getCapabilityByKey("action.trigger_code_scan");
      return {
        kind: "queued_action",
        textResponse: "⚡ **Offline Notice**: Code Quality scans require server-side repository access and cannot be executed while offline. I have saved this action to your pending queue for synchronization once you are back online.",
        matchedCapability: cap,
        queuedAction: {
          actionType: "trigger_code_scan",
          capabilityKey: "action.trigger_code_scan",
          params: { repoId: "pending-repo-id" },
          summary: "Run Code Quality Scan (Queued Offline)",
        },
      };
    }
  }

  if (normalized.includes("setting") || normalized.includes("toggle") || normalized.includes("preference")) {
    const cap = getCapabilityByKey("action.toggle_setting");
    return {
      kind: "queued_action",
      textResponse: "⚡ **Offline Notice**: Preference update saved to offline queue. It will synchronize with your account profile when you reconnect.",
      matchedCapability: cap,
      queuedAction: {
        actionType: "toggle_setting",
        capabilityKey: "action.toggle_setting",
        params: { key: "reduced_motion" },
        summary: "Toggle preference (Queued Offline)",
      },
    };
  }

  // 2. Check for Navigation Requests
  const navKeywords: Record<string, string> = {
    "submission": "nav.researcher_submissions",
    "bount": "nav.researcher_submissions",
    "earning": "nav.researcher_earnings",
    "payout": "nav.researcher_earnings",
    "triage": "nav.org_triage",
    "program": "nav.org_programs",
    "team": "nav.org_team",
    "red team": "nav.ai_red_team",
    "quality": "nav.code_quality",
    "ptaas": "nav.ptaas",
    "pentest": "nav.ptaas",
    "ctf": "nav.ctf",
    "contest": "nav.contests",
    "workspace": "nav.workspaces",
    "setting": "nav.settings",
    "notification": "nav.notifications",
    "overview": "nav.dashboard_overview",
    "dashboard": "nav.dashboard_overview",
  };

  if (
    normalized.startsWith("go to") ||
    normalized.startsWith("take me to") ||
    normalized.startsWith("open") ||
    normalized.startsWith("where is") ||
    normalized.startsWith("navigate")
  ) {
    for (const [kw, capKey] of Object.entries(navKeywords)) {
      if (normalized.includes(kw)) {
        const cap = getCapabilityByKey(capKey);
        if (cap && cap.routePattern) {
          return {
            kind: "navigation",
            textResponse: `Navigating you to **${cap.label}** (${cap.routePattern}).`,
            targetRoute: cap.routePattern,
            matchedCapability: cap,
          };
        }
      }
    }
  }

  // 3. Match against Local Knowledge Base (KB)
  const STOP_WORDS = new Set([
    "what", "is", "the", "in", "of", "and", "a", "an", "to", "for", "with",
    "on", "at", "by", "from", "up", "about", "into", "over", "after", "how",
    "can", "you", "tell", "me", "please", "this", "that", "there", "where",
  ]);

  const queryTokens = normalized
    .split(/\W+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  let bestDoc: (typeof SEED_LOCAL_KB_DOCS)[0] | null = null;
  let bestScore = 0;

  if (queryTokens.length > 0) {
    for (const doc of SEED_LOCAL_KB_DOCS) {
      let score = 0;
      const combined = `${doc.title.toLowerCase()} ${doc.content.toLowerCase()} ${doc.tags.join(" ")}`;

      for (const token of queryTokens) {
        if (doc.tags.includes(token)) score += 4;
        if (doc.title.toLowerCase().includes(token)) score += 3;
        if (combined.includes(token)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestDoc = doc;
      }
    }
  }

  if (bestDoc && bestScore >= 3) {
    return {
      kind: "explanation",
      textResponse: `**${bestDoc.title}** *(Offline Knowledge Base)*\n\n${bestDoc.content}`,
    };
  }

  // 4. Default Fallback
  return {
    kind: "unsupported",
    textResponse: "⚡ **Offline Mode**: I'm currently running in local offline mode. I can help answer questions from the local knowledge base or navigate you between cached dashboard pages. For live data queries or running security scans, please reconnect to the network.",
  };
}

import Dexie, { type Table } from "dexie";
import { type Capability, CAPABILITY_REGISTRY } from "./capability-registry";

export interface CachedUserContext {
  key: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

export interface LocalKbDoc {
  id?: number;
  topic: string;
  title: string;
  content: string;
  tags: string[];
}

export interface PendingAction {
  id?: number;
  actionType: string;
  capabilityKey: string;
  params: Record<string, string>;
  summary: string;
  queuedAt: string;
  status: "queued_offline" | "syncing" | "failed" | "executed";
  error?: string;
  retryCount?: number;
}

export class VaultOfflineDB extends Dexie {
  capabilities!: Table<Capability, string>;
  userContext!: Table<CachedUserContext, string>;
  localKb!: Table<LocalKbDoc, number>;
  pendingActionQueue!: Table<PendingAction, number>;

  constructor() {
    super("VaultOfflineDB");
    this.version(1).stores({
      capabilities: "key, kind, minRole, routePattern",
      userContext: "key, updatedAt",
      localKb: "++id, topic, title, *tags",
      pendingActionQueue: "++id, actionType, capabilityKey, status, queuedAt",
    });
  }
}

export const offlineDb = new VaultOfflineDB();

export const SEED_LOCAL_KB_DOCS: Omit<LocalKbDoc, "id">[] = [
  {
    topic: "general",
    title: "VAULTX Security Platform Overview",
    content: "VAULTX is a zero-infrastructure-cost security platform providing Bug Bounty programs, VDP triage, Code Quality SAST, AI Red Teaming, PTaaS, CTF competitions, and collaborative Workspaces.",
    tags: ["overview", "platform", "general", "vaultx"],
  },
  {
    topic: "researcher",
    title: "Vulnerability Submissions & Severity",
    content: "Researchers can submit bug bounty findings with proof-of-concept steps. Severities are estimated based on CVSS v3.1 metrics (Critical, High, Medium, Low, Info). Rewards are human-approved and disbursed via Stripe Connect.",
    tags: ["submissions", "researcher", "bounties", "cvss", "severity", "earnings"],
  },
  {
    topic: "triage",
    title: "Triage & Validation Workflow",
    content: "Triagers review incoming reports, assess validity, check for duplicates, request more info if steps are incomplete, and transition reports to Accepted, Duplicate, or Needs Info.",
    tags: ["triage", "review", "duplicate", "workflow", "needs_info"],
  },
  {
    topic: "code_quality",
    title: "Code Quality & Web3 Smart Contract Audits",
    content: "Code Quality scans run static analysis (SAST) and Solidity auditing on connected Git repositories, identifying OWASP top 10 flaws and Web3 reentrancy, access control, and oracle manipulation risks.",
    tags: ["code_quality", "sast", "web3", "solidity", "audit", "security_scan"],
  },
  {
    topic: "ptaas",
    title: "Pentest as a Service (PTaaS)",
    content: "PTaaS connects organizations with certified penetration testers for live time-boxed engagements, producing verifiable cryptographic hash-signed PDF reports.",
    tags: ["ptaas", "pentest", "reports", "engagement", "findings"],
  },
  {
    topic: "ai_red_team",
    title: "AI Red Teaming",
    content: "AI Red Teaming runs autonomous adversarial prompts against designated LLM application endpoints to discover jailbreaks, prompt injections, and data exfiltration vulnerabilities.",
    tags: ["ai_red_team", "adversarial", "jailbreak", "prompt_injection", "llm"],
  },
  {
    topic: "ctf",
    title: "Capture The Flag (CTF)",
    content: "CTF competitions allow security teams and researchers to solve challenges across Web, Cryptography, Reverse Engineering, Binary Exploitation, and Forensics to earn points on the live scoreboard.",
    tags: ["ctf", "challenges", "scoreboard", "flags", "competition"],
  },
  {
    topic: "settings",
    title: "Account & Security Settings",
    content: "Configure account profile, notifications (marketing, security alerts, weekly digest), UI accessibility (reduced motion, high contrast), and privacy (AI Agent mode and AI Personalization).",
    tags: ["settings", "preferences", "privacy", "notifications", "agent_mode"],
  },
];

/**
 * Initializes and syncs offline IndexedDB caches when online
 */
export async function initializeOfflineCache(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 1. Seed or refresh Capability Registry snapshot
    await offlineDb.capabilities.bulkPut(CAPABILITY_REGISTRY);

    // 2. Seed Local KB if empty
    const kbCount = await offlineDb.localKb.count();
    if (kbCount === 0) {
      await offlineDb.localKb.bulkAdd(SEED_LOCAL_KB_DOCS as LocalKbDoc[]);
    }
  } catch (err) {
    console.warn("Failed to initialize offline cache:", err);
  }
}

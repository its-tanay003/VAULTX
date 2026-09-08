/**
 * VAULT Copilot — Capability Registry Source of Truth
 *
 * Defines all registered website routes, capabilities, permissions, and
 * agent-callable tools. The agent must NEVER construct routes or actions from
 * memory — everything resolves through this registry.
 */

export type UserRbacRole =
  | "guest"
  | "researcher"
  | "triager"
  | "developer"
  | "maintainer"
  | "org_owner"
  | "system_admin";

export type CapabilityKind =
  | "navigation"
  | "read_action"
  | "write_action"
  | "destructive_action";

export type OfflineBehavior =
  | "read_cached"
  | "queue_for_sync"
  | "unavailable";

export interface Capability {
  key: string;
  label: string;
  description: string;
  routePattern?: string;
  kind: CapabilityKind;
  minRole: UserRbacRole;
  requiresOrgScope: boolean;
  requiresConfirmation: boolean;
  availableOffline: boolean;
  offlineBehavior: OfflineBehavior;
  toolSchema?: Record<string, unknown>;
}

export const ROLE_HIERARCHY: Record<UserRbacRole, number> = {
  guest: 0,
  researcher: 1,
  triager: 2,
  developer: 3,
  maintainer: 4,
  org_owner: 5,
  system_admin: 6,
};

export function isRoleAtLeast(userRole: UserRbacRole, requiredRole: UserRbacRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export const CAPABILITY_REGISTRY: Capability[] = [
  // Navigation Capabilities — Dashboard & Core
  {
    key: "nav.dashboard_overview",
    label: "Dashboard Overview",
    description: "Main entry point showing overview metrics, active alerts, and recent security activity.",
    routePattern: "/dashboard",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.notifications",
    label: "Notifications Feed",
    description: "View real-time security alerts, submission updates, and system notices.",
    routePattern: "/dashboard/notifications",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },

  // Navigation — Researcher
  {
    key: "nav.researcher_submissions",
    label: "Researcher Submissions",
    description: "View and manage all bug bounty submissions made by the researcher.",
    routePattern: "/dashboard/researcher/submissions",
    kind: "navigation",
    minRole: "researcher",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.researcher_submission_detail",
    label: "Submission Details",
    description: "View vulnerability report timeline, triager messages, and reward status.",
    routePattern: "/dashboard/researcher/submissions/[id]",
    kind: "navigation",
    minRole: "researcher",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.researcher_programs",
    label: "Explore Bug Bounty Programs",
    description: "Browse active public and private bug bounty programs, rewards, and scopes.",
    routePattern: "/dashboard/researcher/programs",
    kind: "navigation",
    minRole: "researcher",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.researcher_program_detail",
    label: "Program Scope & Policy",
    description: "Read detailed program rules, in-scope targets, out-of-scope assets, and reward grid.",
    routePattern: "/dashboard/researcher/programs/[id]",
    kind: "navigation",
    minRole: "researcher",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.researcher_earnings",
    label: "Researcher Earnings & Payouts",
    description: "View bounty payout history, pending balances, and Stripe Connect account details.",
    routePattern: "/dashboard/researcher/earnings",
    kind: "navigation",
    minRole: "researcher",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.researcher_leaderboard",
    label: "Researcher Leaderboard",
    description: "Global hacker rankings, reputation scores, and monthly achievements.",
    routePattern: "/dashboard/researcher/leaderboard",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.researcher_rewards",
    label: "Reward Disbursals",
    description: "Track rewarded findings and transaction hashes.",
    routePattern: "/dashboard/researcher/rewards",
    kind: "navigation",
    minRole: "researcher",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },

  // Navigation — Organization & Enterprise
  {
    key: "nav.org_dashboard",
    label: "Organization Dashboard",
    description: "Organization vulnerability overview, open reports, and security program stats.",
    routePattern: "/dashboard/org",
    kind: "navigation",
    minRole: "developer",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.org_programs",
    label: "Manage Security Programs",
    description: "Configure Bug Bounty and Vulnerability Disclosure Program (VDP) policies.",
    routePattern: "/dashboard/org/programs",
    kind: "navigation",
    minRole: "maintainer",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.org_triage",
    label: "Triage Queue",
    description: "Review incoming vulnerability reports, validate findings, and assign severity.",
    routePattern: "/dashboard/org/triage",
    kind: "navigation",
    minRole: "triager",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: false,
    offlineBehavior: "unavailable",
  },
  {
    key: "nav.org_submissions",
    label: "Organization Reports",
    description: "Filter and review all submissions received by the organization.",
    routePattern: "/dashboard/org/submissions",
    kind: "navigation",
    minRole: "developer",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.org_submission_detail",
    label: "Organization Report Detail",
    description: "View submission validation, researcher messages, and award bounty.",
    routePattern: "/dashboard/org/submissions/[id]",
    kind: "navigation",
    minRole: "triager",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: false,
    offlineBehavior: "unavailable",
  },
  {
    key: "nav.org_team",
    label: "Team & Permissions",
    description: "Manage organization members, invite teammates, and assign roles.",
    routePattern: "/dashboard/org/team",
    kind: "navigation",
    minRole: "org_owner",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: false,
    offlineBehavior: "unavailable",
  },
  {
    key: "nav.org_billing",
    label: "Billing & Subscription",
    description: "Manage organization subscription tier, add-ons, invoices, and payment method.",
    routePattern: "/dashboard/org/billing",
    kind: "navigation",
    minRole: "org_owner",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: false,
    offlineBehavior: "unavailable",
  },
  {
    key: "nav.org_payouts",
    label: "Payout Account Settings",
    description: "Configure Stripe Connect treasury and bounty disbursement accounts.",
    routePattern: "/dashboard/org/payouts",
    kind: "navigation",
    minRole: "org_owner",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: false,
    offlineBehavior: "unavailable",
  },
  {
    key: "nav.org_reports",
    label: "Security Reports Builder",
    description: "Generate executive vulnerability trends and compliance reporting.",
    routePattern: "/dashboard/org/reports",
    kind: "navigation",
    minRole: "developer",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },

  // Navigation — Products & Engines
  {
    key: "nav.ai_red_team",
    label: "AI Red Team",
    description: "Autonomous adversarial LLM security scans and target management.",
    routePattern: "/dashboard/ai-red-team",
    kind: "navigation",
    minRole: "maintainer",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.code_quality",
    label: "Code Quality & SAST",
    description: "Static analysis, SAST, and Web3 smart contract security scanning.",
    routePattern: "/dashboard/code-quality",
    kind: "navigation",
    minRole: "developer",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.ptaas",
    label: "PTaaS Engagements",
    description: "Pentest-as-a-Service engagements, live tester collaboration, and findings.",
    routePattern: "/dashboard/ptaas",
    kind: "navigation",
    minRole: "developer",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.ctf",
    label: "CTF Competitions",
    description: "Capture-the-Flag challenges, team scoreboards, and flag submissions.",
    routePattern: "/dashboard/ctf",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.contests",
    label: "Audit Contests",
    description: "Time-boxed competitive smart contract security contests.",
    routePattern: "/dashboard/contests",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.workspaces",
    label: "Collaborative Workspaces",
    description: "Multi-user shared security review environments.",
    routePattern: "/dashboard/workspaces",
    kind: "navigation",
    minRole: "developer",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },

  // Navigation — Settings Subsections
  {
    key: "nav.settings",
    label: "Platform Settings",
    description: "Main settings overview.",
    routePattern: "/dashboard/settings",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.settings_profile",
    label: "Profile Settings",
    description: "Manage avatar, bio, username, and public profile links.",
    routePattern: "/dashboard/settings/profile",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.settings_security",
    label: "Account Security & 2FA",
    description: "Configure password, two-factor authentication, and active sessions.",
    routePattern: "/dashboard/settings/security",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.settings_notifications",
    label: "Notification Preferences",
    description: "Email and push notification alerts configuration.",
    routePattern: "/dashboard/settings/notifications",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.settings_privacy",
    label: "Privacy & AI Controls",
    description: "Manage AI Copilot Assistant mode, behavioral tracking, and data opt-ins.",
    routePattern: "/dashboard/settings/privacy",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: true,
    offlineBehavior: "read_cached",
  },
  {
    key: "nav.settings_api_keys",
    label: "API Keys",
    description: "Create and revoke personal API tokens for automation.",
    routePattern: "/dashboard/settings/api-keys",
    kind: "navigation",
    minRole: "developer",
    requiresOrgScope: false,
    requiresConfirmation: false,
    availableOffline: false,
    offlineBehavior: "unavailable",
  },
  {
    key: "nav.settings_integrations",
    label: "Connected Integrations",
    description: "Manage GitHub, Slack, Discord, and webhook integrations.",
    routePattern: "/dashboard/settings/integrations",
    kind: "navigation",
    minRole: "maintainer",
    requiresOrgScope: true,
    requiresConfirmation: false,
    availableOffline: false,
    offlineBehavior: "unavailable",
  },
  {
    key: "nav.settings_danger",
    label: "Danger Zone",
    description: "Account deletion and data export requests.",
    routePattern: "/dashboard/settings/danger",
    kind: "navigation",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: true,
    availableOffline: false,
    offlineBehavior: "unavailable",
  },

  // Agent-Callable Action Capabilities
  {
    key: "action.trigger_code_scan",
    label: "Trigger Code Scan",
    description: "Run static security analysis and SAST against a connected repository.",
    kind: "write_action",
    minRole: "developer",
    requiresOrgScope: true,
    requiresConfirmation: true,
    availableOffline: false,
    offlineBehavior: "queue_for_sync",
    toolSchema: {
      type: "object",
      properties: {
        repoId: { type: "string", description: "The UUID of the connected repository to scan" },
      },
      required: ["repoId"],
    },
  },
  {
    key: "action.trigger_web3_audit",
    label: "Trigger Web3 Audit",
    description: "Run automated Solidity and smart contract security audit.",
    kind: "write_action",
    minRole: "developer",
    requiresOrgScope: true,
    requiresConfirmation: true,
    availableOffline: false,
    offlineBehavior: "queue_for_sync",
    toolSchema: {
      type: "object",
      properties: {
        repoId: { type: "string", description: "The UUID of the connected repository containing smart contracts" },
      },
      required: ["repoId"],
    },
  },
  {
    key: "action.generate_ptaas_report",
    label: "Generate PTaaS Report",
    description: "Generate signed executive and technical PDF pentest report.",
    kind: "read_action",
    minRole: "triager",
    requiresOrgScope: true,
    requiresConfirmation: true,
    availableOffline: false,
    offlineBehavior: "unavailable",
    toolSchema: {
      type: "object",
      properties: {
        engagementId: { type: "string", description: "The UUID of the completed PTaaS engagement" },
      },
      required: ["engagementId"],
    },
  },
  {
    key: "action.trigger_red_team_scan",
    label: "Trigger Red Team Scan",
    description: "Launch autonomous AI adversarial scan against an approved target.",
    kind: "write_action",
    minRole: "maintainer",
    requiresOrgScope: true,
    requiresConfirmation: true,
    availableOffline: false,
    offlineBehavior: "queue_for_sync",
    toolSchema: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "The UUID of the verified and authorized AI Red Team target" },
      },
      required: ["targetId"],
    },
  },
  {
    key: "action.request_more_info",
    label: "Request More Information",
    description: "Send a structured clarification request to the researcher regarding a submission.",
    kind: "write_action",
    minRole: "triager",
    requiresOrgScope: true,
    requiresConfirmation: true,
    availableOffline: false,
    offlineBehavior: "queue_for_sync",
    toolSchema: {
      type: "object",
      properties: {
        submissionId: { type: "string", description: "The UUID of the submission needing clarification" },
        question: { type: "string", description: "The specific question or reproduction step request" },
      },
      required: ["submissionId", "question"],
    },
  },
  {
    key: "action.toggle_setting",
    label: "Toggle User Setting",
    description: "Update non-critical UI preferences or notification settings.",
    kind: "write_action",
    minRole: "guest",
    requiresOrgScope: false,
    requiresConfirmation: true,
    availableOffline: true,
    offlineBehavior: "queue_for_sync",
    toolSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          enum: [
            "marketing_emails",
            "security_alerts",
            "weekly_digest",
            "reduced_motion",
            "high_contrast",
            "ai_training_opt_in",
            "ai_personalization_opt_in",
          ],
          description: "The preference setting key to toggle",
        },
      },
      required: ["key"],
    },
  },
  {
    key: "action.draft_ctf_challenge",
    label: "Draft CTF Challenge",
    description: "Create a new draft CTF challenge for competition organizers.",
    kind: "write_action",
    minRole: "maintainer",
    requiresOrgScope: true,
    requiresConfirmation: true,
    availableOffline: false,
    offlineBehavior: "queue_for_sync",
    toolSchema: {
      type: "object",
      properties: {
        competitionId: { type: "string", description: "The competition UUID" },
        title: { type: "string", description: "Title of the challenge" },
        description: { type: "string", description: "Detailed challenge prompt" },
        category: { type: "string", description: "Challenge category (e.g. web, crypto, reverse, pwn)" },
        difficulty: { type: "string", description: "Difficulty rating (easy, medium, hard)" },
        flag: { type: "string", description: "Secret flag (e.g. VAULT{...})" },
        hint: { type: "string", description: "Optional hint" },
      },
      required: ["competitionId", "title", "category", "difficulty", "flag"],
    },
  },
];

export function getCapabilityByKey(key: string): Capability | undefined {
  return CAPABILITY_REGISTRY.find((c) => c.key === key);
}

export function listCapabilitiesForRole(role: UserRbacRole): Capability[] {
  return CAPABILITY_REGISTRY.filter((c) => isRoleAtLeast(role, c.minRole));
}

export function listAgentTools(): Capability[] {
  return CAPABILITY_REGISTRY.filter((c) => c.kind !== "navigation" && !!c.toolSchema);
}

export function listNavigationCapabilities(): Capability[] {
  return CAPABILITY_REGISTRY.filter((c) => c.kind === "navigation" && !!c.routePattern);
}

export function findCapabilityByRoute(pathname: string): Capability | undefined {
  return CAPABILITY_REGISTRY.find((c) => {
    if (!c.routePattern) return false;
    if (c.routePattern === pathname) return true;
    const regexPattern = "^" + c.routePattern.replace(/\[\w+\]/g, "[^/]+") + "$";
    return new RegExp(regexPattern).test(pathname);
  });
}

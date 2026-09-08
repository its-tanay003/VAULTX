import { describe, it, expect } from "vitest";
import {
  understand,
  retrieveContext,
  determineIntent,
  checkPermissions,
  selectTool,
  executeTool,
  verifyExecution,
  formatDataBlock,
} from "../lib/agent/pipeline";

describe("VAULT Copilot Pipeline Orchestrator", () => {
  it("Stage 1: understands incoming message", () => {
    const res = understand({
      userId: "u1",
      role: "developer",
      message: "Run a security scan on this repo",
      agentModeEnabled: true,
    });
    expect(res.rawMessage).toBe("Run a security scan on this repo");
  });

  it("Stage 2: retrieves context with available capabilities for role", async () => {
    const understood = understand({
      userId: "u1",
      orgId: "org-1",
      role: "triager",
      message: "Check triage queue",
      agentModeEnabled: true,
    });

    const ctx = await retrieveContext(understood, {
      userId: "u1",
      orgId: "org-1",
      role: "triager",
      message: "Check triage queue",
      agentModeEnabled: true,
    }, "Triager Profile");

    expect(ctx.availableCapabilities.length).toBeGreaterThan(0);
    expect(ctx.personalizationSummary).toBe("Triager Profile");
  });

  it("Stage 3: determines intent from action candidate", () => {
    const ctx = {
      userId: "u1",
      role: "developer" as const,
      viewContextData: "",
      availableCapabilities: [],
    };

    const intent = determineIntent(
      { type: "trigger_code_scan", params: { repoId: "r1" } },
      ctx
    );

    expect(intent.capabilityKey).toBe("action.trigger_code_scan");
    expect(intent.params).toEqual({ repoId: "r1" });
  });

  it("Stage 4 & 5: checks permissions and selects tool", () => {
    const ctx = {
      userId: "u1",
      orgId: "org-1",
      role: "developer" as const,
      viewContextData: "",
      availableCapabilities: [],
    };

    const auth = checkPermissions(
      { capabilityKey: "action.trigger_code_scan", params: { repoId: "repo-123" } },
      ctx
    );

    expect(auth.allowed).toBe(true);
    const tool = selectTool(auth);
    expect(tool?.key).toBe("action.trigger_code_scan");
  });

  it("Stage 6: drafts proposal card for unconfirmed mutation", async () => {
    const ctx = {
      userId: "u1",
      orgId: "org-1",
      role: "developer" as const,
      viewContextData: "",
      availableCapabilities: [],
    };

    const auth = checkPermissions(
      { capabilityKey: "action.trigger_code_scan", params: { repoId: "repo-123" } },
      ctx
    );

    const tool = selectTool(auth)!;
    const { proposalCard } = await executeTool(tool, auth.sanitizedParams!, false);

    expect(proposalCard).toBeDefined();
    expect(proposalCard?.key).toBe("action.trigger_code_scan");
    expect(proposalCard?.params.repoId).toBe("repo-123");
  });

  it("Stage 7: verifies execution result", async () => {
    const tool = {
      key: "action.trigger_code_scan",
      label: "Trigger Code Scan",
      description: "Test",
      kind: "write_action" as const,
      minRole: "developer" as const,
      requiresOrgScope: true,
      requiresConfirmation: true,
      availableOffline: false,
      offlineBehavior: "queue_for_sync" as const,
    };

    const successVerify = await verifyExecution(tool, { success: true, result: { message: "Scan started" } });
    expect(successVerify.verified).toBe(true);

    const failVerify = await verifyExecution(tool, { success: false, error: "Database error" });
    expect(failVerify.verified).toBe(false);
    expect(failVerify.error).toBe("Database error");
  });

  it("Prompt Defense: correctly formats [DATA] blocks", () => {
    const formatted = formatDataBlock("Target user submitted string with <script>alert(1)</script>");
    expect(formatted.startsWith("[DATA]\n")).toBe(true);
    expect(formatted.endsWith("\n[/DATA]")).toBe(true);
  });
});

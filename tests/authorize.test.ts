import { describe, it, expect } from "vitest";
import { authorizeToolCall } from "../lib/agent/authorize";
import { isRoleAtLeast } from "../lib/agent/capability-registry";

describe("Role Hierarchy & Authorization Chokepoint", () => {
  describe("isRoleAtLeast", () => {
    it("correctly evaluates 7-tier role ranking", () => {
      expect(isRoleAtLeast("guest", "guest")).toBe(true);
      expect(isRoleAtLeast("researcher", "guest")).toBe(true);
      expect(isRoleAtLeast("researcher", "developer")).toBe(false);
      expect(isRoleAtLeast("developer", "triager")).toBe(true);
      expect(isRoleAtLeast("maintainer", "developer")).toBe(true);
      expect(isRoleAtLeast("org_owner", "maintainer")).toBe(true);
      expect(isRoleAtLeast("system_admin", "org_owner")).toBe(true);
      expect(isRoleAtLeast("developer", "org_owner")).toBe(false);
    });
  });

  describe("authorizeToolCall", () => {
    it("denies access to an unknown capability", () => {
      const result = authorizeToolCall({
        userId: "user-123",
        role: "system_admin",
        capabilityKey: "non_existent_action",
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("UNKNOWN_CAPABILITY");
    });

    it("denies access if user role is below min_role", () => {
      // action.trigger_code_scan requires developer role
      const result = authorizeToolCall({
        userId: "user-123",
        orgId: "org-1",
        role: "researcher",
        capabilityKey: "action.trigger_code_scan",
        params: { repoId: "repo-123" },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("INSUFFICIENT_ROLE");
      expect(result.message).toContain("does not meet the minimum required role");
    });

    it("denies access if action requires org scope but orgId is missing", () => {
      // action.trigger_code_scan requires org scope
      const result = authorizeToolCall({
        userId: "user-123",
        orgId: null,
        role: "developer",
        capabilityKey: "action.trigger_code_scan",
        params: { repoId: "repo-123" },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("MISSING_ORG_SCOPE");
      expect(result.message).toContain("requires an active organization context");
    });

    it("denies access if required parameters are missing or empty", () => {
      const result = authorizeToolCall({
        userId: "user-123",
        orgId: "org-1",
        role: "developer",
        capabilityKey: "action.trigger_code_scan",
        params: {},
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("INVALID_PARAMS");
      expect(result.message).toContain("Missing required parameter \"repoId\"");
    });

    it("authorizes valid developer code scan with required org and params", () => {
      const result = authorizeToolCall({
        userId: "user-123",
        orgId: "org-1",
        role: "developer",
        capabilityKey: "action.trigger_code_scan",
        params: { repoId: "repo-abc-123" },
      });

      expect(result.allowed).toBe(true);
      expect(result.sanitizedParams?.repoId).toBe("repo-abc-123");
      expect(result.capability?.key).toBe("action.trigger_code_scan");
    });

    it("authorizes settings toggle for guest role without org requirement", () => {
      const result = authorizeToolCall({
        userId: "user-123",
        role: "guest",
        capabilityKey: "action.toggle_setting",
        params: { key: "reduced_motion" },
      });

      expect(result.allowed).toBe(true);
      expect(result.sanitizedParams?.key).toBe("reduced_motion");
    });

    it("denies settings toggle if key is not in enum", () => {
      const result = authorizeToolCall({
        userId: "user-123",
        role: "guest",
        capabilityKey: "action.toggle_setting",
        params: { key: "invalid_key_attempt" },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("INVALID_PARAMS");
      expect(result.message).toContain("not within allowed choices");
    });
  });
});

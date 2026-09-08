import { describe, it, expect } from "vitest";
import { verifyCapabilityRegistry } from "../scripts/sync-capability-registry";

describe("Capability Registry & Route Verification", () => {
  it("verifies capability registry integrity and no duplicate keys", () => {
    const result = verifyCapabilityRegistry();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

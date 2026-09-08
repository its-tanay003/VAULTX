import { describe, it, expect } from "vitest";
import { matchOfflineQuery } from "../lib/agent/offline-matcher";

describe("Offline Intent Matcher & Local Knowledge Base", () => {
  it("matches navigation queries correctly to registered capability routes", () => {
    const navSubmissions = matchOfflineQuery("take me to submissions");
    expect(navSubmissions.kind).toBe("navigation");
    expect(navSubmissions.targetRoute).toBe("/dashboard/researcher/submissions");

    const navCodeQuality = matchOfflineQuery("go to code quality");
    expect(navCodeQuality.kind).toBe("navigation");
    expect(navCodeQuality.targetRoute).toBe("/dashboard/code-quality");
  });

  it("answers explanatory questions using local knowledge base without network", () => {
    const ptaasQuery = matchOfflineQuery("how does ptaas work?");
    expect(ptaasQuery.kind).toBe("explanation");
    expect(ptaasQuery.textResponse).toContain("Pentest as a Service (PTaaS)");

    const ctfQuery = matchOfflineQuery("tell me about ctf competitions");
    expect(ctfQuery.kind).toBe("explanation");
    expect(ctfQuery.textResponse).toContain("Capture The Flag (CTF)");
  });

  it("queues write actions and explicitly informs user that action cannot run offline", () => {
    const scanQuery = matchOfflineQuery("run a code scan on my repo");
    expect(scanQuery.kind).toBe("queued_action");
    expect(scanQuery.textResponse).toContain("Offline Notice");
    expect(scanQuery.textResponse).toContain("saved this action to your pending queue");
    expect(scanQuery.queuedAction?.actionType).toBe("trigger_code_scan");
  });

  it("provides graceful fallback for completely unknown offline queries", () => {
    const unknownQuery = matchOfflineQuery("what is the weather in Paris?");
    expect(unknownQuery.kind).toBe("unsupported");
    expect(unknownQuery.textResponse).toContain("Offline Mode");
  });
});

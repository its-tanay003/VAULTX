import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { convertToUsdEstimate } from "../lib/currency/convert";

describe("convertToUsdEstimate", () => {
  beforeAll(() => {
    // Mock global fetch to isolate the test from external network calls
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            rates: {
              EUR: 0.92, // 1 USD = 0.92 EUR
              GBP: 0.78, // 1 USD = 0.78 GBP
            },
          }),
      })
    ) as unknown as typeof fetch;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("should return null for USD currency", async () => {
    const result = await convertToUsdEstimate(100, "USD");
    expect(result).toBeNull();
  });

  it("should convert EUR to USD estimate correctly", async () => {
    // 100 EUR / 0.92 = ~109 USD
    const result = await convertToUsdEstimate(100, "EUR");
    expect(result).toBe(109);
  });

  it("should convert GBP to USD estimate correctly", async () => {
    // 100 GBP / 0.78 = ~128 USD
    const result = await convertToUsdEstimate(100, "GBP");
    expect(result).toBe(128);
  });

  it("should return null for unsupported currency", async () => {
    const result = await convertToUsdEstimate(100, "XYZ");
    expect(result).toBeNull();
  });
});

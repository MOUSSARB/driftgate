import { describe, expect, it } from "vitest";
import { lcsLength, sequenceSimilarity } from "../src/comparison/sequence.js";

describe("sequence comparison", () => {
  it("computes LCS length", () => {
    const baseline = [
      "lookup_customer",
      "get_subscription",
      "confirm_user",
      "cancel_subscription",
    ];

    const candidate = [
      "lookup_customer",
      "get_subscription",
      "cancel_subscription",
    ];

    expect(lcsLength(baseline, candidate)).toBe(3);
  });

  it("computes normalized sequence similarity", () => {
    const baseline = ["a", "b", "c", "d"];
    const candidate = ["a", "b", "d"];

    expect(sequenceSimilarity(baseline, candidate)).toBeCloseTo(6 / 7, 6);
  });

  it("returns 1 for two empty sequences", () => {
    expect(sequenceSimilarity([], [])).toBe(1);
  });
});

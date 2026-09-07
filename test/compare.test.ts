import { describe, expect, it } from "vitest";
import { compareTraces } from "../src/comparison/compare.js";
import type { DriftGateConfig } from "../src/core/config.js";
import type { DriftTrace } from "../src/core/schema.js";

const config: DriftGateConfig = {
  version: 1,
  defaults: {
    maxCostIncreasePercent: 25,
    maxLatencyIncreasePercent: 40,
  },
  comparison: {
    toolSequence: {
      mode: "compatible",
      warnBelowSimilarity: 0.7,
    },
  },
};

function trace(overrides: Partial<DriftTrace> = {}): DriftTrace {
  return {
    schemaVersion: "driftgate/v1",
    traceId: "trace-1",
    scenarioId: "cancel-subscription",
    source: "generic",
    durationMs: 100,
    usage: {
      costUsd: 0.01,
    },
    spans: [
      {
        id: "1",
        kind: "tool",
        name: "lookup_customer",
        status: "ok",
      },
      {
        id: "2",
        kind: "tool",
        name: "confirm_user",
        status: "ok",
      },
    ],
    ...overrides,
  };
}

describe("compareTraces", () => {
  it("passes identical traces", () => {
    const baseline = trace();
    const candidate = trace({ traceId: "trace-2" });

    const result = compareTraces(baseline, candidate, config);

    expect(result.status).toBe("pass");
    expect(result.issues).toHaveLength(0);
  });

  it("fails when candidate introduces an execution error", () => {
    const baseline = trace();
    const candidate = trace({
      traceId: "trace-2",
      spans: [
        {
          id: "1",
          kind: "tool",
          name: "lookup_customer",
          status: "error",
          error: {
            message: "Customer API unavailable",
          },
        },
      ],
    });

    const result = compareTraces(baseline, candidate, config);

    expect(result.status).toBe("fail");
    expect(result.issues.some((issue) => issue.type === "new-error")).toBe(true);
  });

  it("warns when cost exceeds the configured threshold", () => {
    const baseline = trace();
    const candidate = trace({
      traceId: "trace-2",
      usage: {
        costUsd: 0.02,
      },
    });

    const result = compareTraces(baseline, candidate, config);

    expect(result.status).toBe("warn");
    expect(result.issues.some((issue) => issue.type === "cost")).toBe(true);
  });
});

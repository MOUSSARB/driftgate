import type { DriftGateConfig } from "../core/config.js";
import type { DriftTrace } from "../core/schema.js";
import { sequenceSimilarity } from "./sequence.js";

export type ComparisonStatus = "pass" | "warn" | "fail";
export type IssueSeverity = "warn" | "fail";

export interface ComparisonIssue {
  severity: IssueSeverity;
  type: "tool-sequence" | "new-error" | "cost" | "latency";
  message: string;
}

export interface ComparisonResult {
  scenarioId: string;
  status: ComparisonStatus;
  toolSequence: {
    baseline: string[];
    candidate: string[];
    similarity: number;
  };
  metrics: {
    costDeltaPercent?: number;
    latencyDeltaPercent?: number;
  };
  issues: ComparisonIssue[];
}

export function extractToolNames(trace: DriftTrace): string[] {
  return trace.spans
    .filter((span) => span.kind === "tool")
    .map((span) => span.name);
}

function hasExecutionError(trace: DriftTrace): boolean {
  return trace.spans.some(
    (span) => span.status === "error" || span.error !== undefined,
  );
}

function percentDelta(
  baseline: number | undefined,
  candidate: number | undefined,
): number | undefined {
  if (baseline === undefined || candidate === undefined || baseline === 0) {
    return undefined;
  }

  return ((candidate - baseline) / baseline) * 100;
}

export function compareTraces(
  baseline: DriftTrace,
  candidate: DriftTrace,
  config: DriftGateConfig,
): ComparisonResult {
  if (baseline.scenarioId !== candidate.scenarioId) {
    throw new Error(
      `Scenario mismatch: baseline=${baseline.scenarioId}, candidate=${candidate.scenarioId}`,
    );
  }

  const issues: ComparisonIssue[] = [];
  const baselineTools = extractToolNames(baseline);
  const candidateTools = extractToolNames(candidate);
  const similarity = sequenceSimilarity(baselineTools, candidateTools);

  const toolThreshold = config.comparison.toolSequence.warnBelowSimilarity;

  if (similarity < toolThreshold) {
    issues.push({
      severity:
        config.comparison.toolSequence.mode === "strict" ? "fail" : "warn",
      type: "tool-sequence",
      message: `Tool sequence similarity is ${(similarity * 100).toFixed(1)}% (threshold ${(toolThreshold * 100).toFixed(1)}%).`,
    });
  }

  if (!hasExecutionError(baseline) && hasExecutionError(candidate)) {
    issues.push({
      severity: "fail",
      type: "new-error",
      message: "Candidate introduced an execution error.",
    });
  }

  const costDeltaPercent = percentDelta(
    baseline.usage?.costUsd,
    candidate.usage?.costUsd,
  );

  if (
    costDeltaPercent !== undefined &&
    costDeltaPercent > config.defaults.maxCostIncreasePercent
  ) {
    issues.push({
      severity: "warn",
      type: "cost",
      message: `Cost increased ${costDeltaPercent.toFixed(1)}% (limit ${config.defaults.maxCostIncreasePercent.toFixed(1)}%).`,
    });
  }

  const latencyDeltaPercent = percentDelta(
    baseline.durationMs,
    candidate.durationMs,
  );

  if (
    latencyDeltaPercent !== undefined &&
    latencyDeltaPercent > config.defaults.maxLatencyIncreasePercent
  ) {
    issues.push({
      severity: "warn",
      type: "latency",
      message: `Latency increased ${latencyDeltaPercent.toFixed(1)}% (limit ${config.defaults.maxLatencyIncreasePercent.toFixed(1)}%).`,
    });
  }

  const status: ComparisonStatus = issues.some(
    (issue) => issue.severity === "fail",
  )
    ? "fail"
    : issues.length > 0
      ? "warn"
      : "pass";

  return {
    scenarioId: baseline.scenarioId,
    status,
    toolSequence: {
      baseline: baselineTools,
      candidate: candidateTools,
      similarity,
    },
    metrics: {
      costDeltaPercent,
      latencyDeltaPercent,
    },
    issues,
  };
}

import pc from "picocolors";
import type {
  ComparisonIssue,
  ComparisonResult,
} from "../comparison/compare.js";

function statusLabel(status: ComparisonResult["status"]): string {
  switch (status) {
    case "pass":
      return pc.green("PASS");
    case "warn":
      return pc.yellow("WARN");
    case "fail":
      return pc.red("FAIL");
  }
}

function issuePrefix(issue: ComparisonIssue): string {
  return issue.severity === "fail" ? pc.red("✗") : pc.yellow("⚠");
}

function formatSequence(sequence: string[]): string {
  return sequence.length > 0 ? sequence.join(" → ") : "(none)";
}

export function reportComparison(result: ComparisonResult): void {
  console.log(`\n${pc.bold("DriftGate")} — ${result.scenarioId}`);
  console.log(`Result: ${statusLabel(result.status)}`);
  console.log(
    `Tool similarity: ${(result.toolSequence.similarity * 100).toFixed(1)}%`,
  );

  if (
    result.toolSequence.baseline.join("\u0000") !==
    result.toolSequence.candidate.join("\u0000")
  ) {
    console.log(`  baseline:  ${formatSequence(result.toolSequence.baseline)}`);
    console.log(`  candidate: ${formatSequence(result.toolSequence.candidate)}`);
  }

  for (const issue of result.issues) {
    console.log(`${issuePrefix(issue)} ${issue.message}`);
  }

  if (result.issues.length === 0) {
    console.log(pc.green("✓ No behavioral drift detected."));
  }
}

export function reportSummary(results: ComparisonResult[]): void {
  const passed = results.filter((result) => result.status === "pass").length;
  const warned = results.filter((result) => result.status === "warn").length;
  const failed = results.filter((result) => result.status === "fail").length;

  console.log("\n" + pc.bold("Summary"));
  console.log(
    `${pc.green(`${passed} passed`)} · ${pc.yellow(`${warned} warned`)} · ${pc.red(`${failed} failed`)}`,
  );
}

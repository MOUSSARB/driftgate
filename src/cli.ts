#!/usr/bin/env node

import { access, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Command } from "commander";
import { ZodError } from "zod";
import { compareTraces } from "./comparison/compare.js";
import {
  DEFAULT_CONFIG_YAML,
  readConfig,
} from "./core/config.js";
import { driftTraceSchema } from "./core/schema.js";
import {
  ensureStore,
  listComparableScenarioIds,
  loadTrace,
  saveTrace,
  type TraceLabel,
} from "./store/filesystem.js";
import {
  reportComparison,
  reportSummary,
} from "./reporters/terminal.js";

interface RecordOptions {
  scenario: string;
  label: TraceLabel;
  file: string;
}

interface TestOptions {
  scenario?: string;
  json?: boolean;
}

async function initCommand(): Promise<void> {
  const cwd = process.cwd();
  await ensureStore(cwd);

  const configPath = join(cwd, ".driftgate.yml");

  try {
    await access(configPath);
    console.log("✓ DriftGate store ready; .driftgate.yml already exists.");
  } catch {
    await writeFile(configPath, DEFAULT_CONFIG_YAML, "utf8");
    console.log("✓ DriftGate initialized.");
  }
}

async function recordCommand(options: RecordOptions): Promise<void> {
  if (options.label !== "baseline" && options.label !== "candidate") {
    throw new Error("--label must be either baseline or candidate");
  }

  const raw = await readFile(resolve(options.file), "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Trace JSON must contain an object.");
  }

  const trace = driftTraceSchema.parse({
    ...parsed,
    schemaVersion: "driftgate/v1",
    scenarioId: options.scenario,
  });

  const path = await saveTrace(trace, options.label);
  console.log(`✓ Recorded ${options.label}: ${options.scenario}`);
  console.log(`  ${path}`);
}

async function testCommand(options: TestOptions): Promise<void> {
  const config = await readConfig();
  const scenarioIds = options.scenario
    ? [options.scenario]
    : await listComparableScenarioIds();

  if (scenarioIds.length === 0) {
    throw new Error(
      "No comparable scenarios found. Record both a baseline and a candidate first.",
    );
  }

  const results = [];

  for (const scenarioId of scenarioIds) {
    const [baseline, candidate] = await Promise.all([
      loadTrace(scenarioId, "baseline"),
      loadTrace(scenarioId, "candidate"),
    ]);

    results.push(compareTraces(baseline, candidate, config));
  }

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const result of results) {
      reportComparison(result);
    }
    reportSummary(results);
  }

  if (results.some((result) => result.status === "fail")) {
    process.exitCode = 1;
  }
}

const program = new Command();

program
  .name("driftgate")
  .description("Behavioral regression testing for AI agents")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize DriftGate in the current repository")
  .action(initCommand);

program
  .command("record")
  .description("Record a canonical DriftGate trace")
  .requiredOption("-s, --scenario <id>", "Scenario identifier")
  .requiredOption("-l, --label <label>", "baseline or candidate")
  .requiredOption("-f, --file <file>", "Trace JSON file")
  .action(recordCommand);

program
  .command("test")
  .description("Compare candidate traces against baselines")
  .option("-s, --scenario <id>", "Run one scenario")
  .option("--json", "Output machine-readable JSON")
  .action(testCommand);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof ZodError) {
    console.error("Invalid DriftGate data:");
    console.error(error.issues);
  } else if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error(error);
  }

  process.exitCode = 2;
}

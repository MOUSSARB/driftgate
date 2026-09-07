import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDriftTrace, type DriftTrace } from "../core/schema.js";

export type TraceLabel = "baseline" | "candidate";

function labelDirectory(label: TraceLabel): string {
  return label === "baseline" ? "baselines" : "candidates";
}

export function driftgateDirectory(cwd: string = process.cwd()): string {
  return join(cwd, ".driftgate");
}

export async function ensureStore(cwd: string = process.cwd()): Promise<void> {
  const root = driftgateDirectory(cwd);

  await Promise.all([
    mkdir(join(root, "baselines"), { recursive: true }),
    mkdir(join(root, "candidates"), { recursive: true }),
    mkdir(join(root, "runs"), { recursive: true }),
  ]);
}

export async function saveTrace(
  trace: DriftTrace,
  label: TraceLabel,
  cwd: string = process.cwd(),
): Promise<string> {
  await ensureStore(cwd);

  const path = join(
    driftgateDirectory(cwd),
    labelDirectory(label),
    `${trace.scenarioId}.json`,
  );

  await writeFile(path, `${JSON.stringify(trace, null, 2)}\n`, "utf8");
  return path;
}

export async function loadTrace(
  scenarioId: string,
  label: TraceLabel,
  cwd: string = process.cwd(),
): Promise<DriftTrace> {
  const path = join(
    driftgateDirectory(cwd),
    labelDirectory(label),
    `${scenarioId}.json`,
  );

  const raw = await readFile(path, "utf8");
  return parseDriftTrace(JSON.parse(raw));
}

async function listScenarioIdsForLabel(
  label: TraceLabel,
  cwd: string,
): Promise<string[]> {
  const directory = join(driftgateDirectory(cwd), labelDirectory(label));

  try {
    const files = await readdir(directory, { withFileTypes: true });

    return files
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.slice(0, -5))
      .sort();
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

export async function listComparableScenarioIds(
  cwd: string = process.cwd(),
): Promise<string[]> {
  const [baselines, candidates] = await Promise.all([
    listScenarioIdsForLabel("baseline", cwd),
    listScenarioIdsForLabel("candidate", cwd),
  ]);

  const candidateSet = new Set(candidates);
  return baselines.filter((scenarioId) => candidateSet.has(scenarioId));
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const configSchema = z.object({
  version: z.literal(1).default(1),
  defaults: z
    .object({
      maxCostIncreasePercent: z.number().nonnegative().default(25),
      maxLatencyIncreasePercent: z.number().nonnegative().default(40),
    })
    .default({
      maxCostIncreasePercent: 25,
      maxLatencyIncreasePercent: 40,
    }),
  comparison: z
    .object({
      toolSequence: z
        .object({
          mode: z.enum(["strict", "compatible"]).default("compatible"),
          warnBelowSimilarity: z.number().min(0).max(1).default(0.7),
        })
        .default({
          mode: "compatible",
          warnBelowSimilarity: 0.7,
        }),
    })
    .default({
      toolSequence: {
        mode: "compatible",
        warnBelowSimilarity: 0.7,
      },
    }),
});

export type DriftGateConfig = z.infer<typeof configSchema>;

export const DEFAULT_CONFIG_YAML = `version: 1

defaults:
  maxCostIncreasePercent: 25
  maxLatencyIncreasePercent: 40

comparison:
  toolSequence:
    mode: compatible
    warnBelowSimilarity: 0.70
`;

export async function readConfig(
  cwd: string = process.cwd(),
): Promise<DriftGateConfig> {
  const configPath = join(cwd, ".driftgate.yml");

  try {
    const raw = await readFile(configPath, "utf8");
    return configSchema.parse(parseYaml(raw));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return configSchema.parse({});
    }

    throw error;
  }
}

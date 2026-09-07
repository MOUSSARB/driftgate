import { z } from "zod";

export const driftTraceSourceSchema = z.enum([
  "openai",
  "anthropic",
  "mcp",
  "otel",
  "http",
  "generic",
]);

export const spanKindSchema = z.enum([
  "agent",
  "llm",
  "tool",
  "guardrail",
  "handoff",
  "http",
  "custom",
]);

export const driftUsageSchema = z.object({
  inputTokens: z.number().nonnegative().optional(),
  outputTokens: z.number().nonnegative().optional(),
  cachedInputTokens: z.number().nonnegative().optional(),
  cacheWriteTokens: z.number().nonnegative().optional(),
  costUsd: z.number().nonnegative().optional(),
});

export const driftSpanSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().min(1).optional(),
  kind: spanKindSchema,
  name: z.string().min(1),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  durationMs: z.number().nonnegative().optional(),
  status: z.enum(["ok", "error"]).optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  error: z
    .object({
      type: z.string().optional(),
      message: z.string(),
    })
    .optional(),
  usage: driftUsageSchema.optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const driftTraceSchema = z.object({
  schemaVersion: z.literal("driftgate/v1"),
  traceId: z.string().min(1),
  scenarioId: z.string().min(1),
  source: driftTraceSourceSchema,
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  durationMs: z.number().nonnegative().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  usage: driftUsageSchema.optional(),
  spans: z.array(driftSpanSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DriftTraceSource = z.infer<typeof driftTraceSourceSchema>;
export type SpanKind = z.infer<typeof spanKindSchema>;
export type DriftUsage = z.infer<typeof driftUsageSchema>;
export type DriftSpan = z.infer<typeof driftSpanSchema>;
export type DriftTrace = z.infer<typeof driftTraceSchema>;

export function parseDriftTrace(input: unknown): DriftTrace {
  return driftTraceSchema.parse(input);
}

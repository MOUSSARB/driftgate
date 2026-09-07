# DriftGate — Day 1–3 MVP

Behavioral regression testing for AI-agent traces.

## Requirements

- Node.js 22+
- pnpm 10+

## Setup

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install
pnpm build
pnpm test
```

`pnpm install` generates `pnpm-lock.yaml`. Commit the generated lockfile.

## Local smoke test

```bash
node dist/cli.js init

node dist/cli.js record \
  --scenario cancel-subscription \
  --label baseline \
  --file examples/baseline.json

node dist/cli.js record \
  --scenario cancel-subscription \
  --label candidate \
  --file examples/candidate.json

node dist/cli.js test
```

For machine-readable output:

```bash
node dist/cli.js test --json
```

During development:

```bash
pnpm dev -- init
pnpm dev -- test
```

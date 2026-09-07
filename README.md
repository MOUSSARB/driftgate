# DriftGate

Behavioral regression testing for AI agents.

## What it does

DriftGate replays agent scenarios in CI and compares tool trajectories, arguments, cost, and latency between baseline and candidate versions.

## Quick Start

```bash
git clone https://github.com/MOUSSARB/driftgate.git
cd driftgate
pnpm install
pnpm build

node dist/cli.js init
node dist/cli.js record --scenario cancel-subscription --label baseline --file examples/baseline.json
node dist/cli.js record --scenario cancel-subscription --label candidate --file examples/candidate.json
node dist/cli.js test

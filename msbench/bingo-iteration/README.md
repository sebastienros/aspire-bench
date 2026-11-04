# Bingo running-application iteration: player API routing

I01 in the [research program](../AGENTIC-RESEARCH.md). This is a new functional
change task, not a resubmission of the original startup/health benchmarks.

The existing Bingo player proxies only `/api/version-info` and SignalR. The
task asks the agent to make the existing producer API available through the
player origin, changing only `src/bingo-board/vite.config.js` while the app runs.
Vite's normal config reload is sufficient; backend/dependency restarts are
prohibited and detected. There is no benchmark-specific JSON reporting task.

| Arm | Existing app and guidance | Toolchain |
|---|---|---|
| `raw-scripted` | Original raw Bingo, useful launcher/check scripts and README | Existing .NET/Node/Docker pins; no Aspire skill exposure |
| `aspire` | Original Aspire Bingo, seven original general skills plus startup | Same .NET/Node/Docker pins, Aspire 13.6.0; MCP disabled |

These are a first feasibility comparison of current workflows, not the final
strongest Aspire configuration or a skill/MCP ablation. The custom-source
Aspire build is deliberately not substituted until its full Bingo lifecycle
and task architecture compatibility are established.

## Setup and grading

Each private privileged Docker environment starts its own Docker daemon and
application before the agent. Its original validated startup recipe writes the
two endpoint origins. Setup first verifies existing functionality, proves the
producer proxy is not already working, and creates a random persistent square
and called-square sentinel. The healthcheck waits for setup completion, not
just Docker readiness. Setup time is not included in agent task time.

The protected grader outside `/app` verifies:

- Fresh random square import/call/status/clear through the frontend, with real
  backend observations confirming PostgreSQL/Redis side effects.
- Original admin login, frontend, version proxy, SignalR negotiation, and the
  preexisting square's label/called-state survive.
- Empty import still returns 400 and a nonexistent square returns 404.
- Source/guidance outside the one allowed config file and endpoint file remain
  unchanged; the backend PID/start time and owned dependency IDs/start times/
  restart counts match setup.

The grader never reads an agent-written success report. Oracle validation also
proves that unchanged routing, an unrelated README modification, invalid
endpoint metadata, and lost prior called-state are rejected, then restores
the fixture and verifies the correct source repair.

The agent has container root, so grader location/input hashing are regression
controls, not a claim of tamper-proof adversarial isolation. The prompt names
the editable frontend config: this tests constrained iteration, not root-cause
localization or a complex distributed incident. D01 will be separate.

Both tasks statically copy existing app sources from commit
`baacba3e17181491c9a4d419db7d0e6763c3d363`; Aspire general skills remain pinned
to `1fcca7e91c89716f0e4a8bf7324da13a39f70c66`. No Vally synchronization or
changes to historical fixtures are introduced.

## Local evidence, 2026-11-04

| Validation | Result | Retained evidence |
|---|---|---|
| Raw positive Docker oracle | Reward 1, no exception | `.runs/msbench-oracle/bingo-iteration-raw-v1/` |
| Aspire positive Docker oracle | Reward 1, no exception | `.runs/msbench-oracle/bingo-iteration-aspire-v1/` |
| Raw oracle with four negative cases and final positive check | All rejected; reward 1, no exception | `.runs/msbench-oracle/bingo-iteration-raw-negatives/` |
| Aspire oracle with same four negatives and final positive check | All rejected; reward 1, no exception | `.runs/msbench-oracle/bingo-iteration-aspire-negatives/` |
| Matched-task structural tests | 3 passed | `node --test msbench/bingo-iteration/experiment.test.mjs` |

The second oracle run added real grader rejection checks; it was not another
model attempt under identical conditions. All four executions were oracles,
not inferred development solutions or performance measurements.

Reproduce only when validating a fixture change:

```bash
node --test msbench/bingo-iteration/experiment.test.mjs
harbor run --path msbench/bingo-iteration/tasks/raw-scripted --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name iteration-raw-validation --n-concurrent 1
harbor run --path msbench/bingo-iteration/tasks/aspire --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name iteration-aspire-validation --n-concurrent 1
```

## Low-budget inference gate

User preference: an accessible low-budget model such as GPT 6.1 Terra, one
original attempt per arm initially, no duplicate-condition sweeps. Record exact
agent/model/version and a condition fingerprint before submission. Never
silently substitute a model or compare its times with historical Luna results.

MSBench 0.3.67's accessible staging Agent Registry was queried successfully.
Model discovery through both the built-in dev1 index and an explicitly scoped
staging index returned HTTP 403. No inference has been submitted, no model
availability is claimed, and no model substitution or proxy-bypass flag was
used. Logs: `.runs/agentic-research/model-discovery.log` and
`staging-discovery.log`. This is a model-discovery/access blocker, not an
Aspire or scenario failure. The CLI reports a newer release exists; no upgrade
has been performed or assumed to resolve server access.

Next: verify accessible model routing, then use the pinned dataset for the two
new pilot conditions. Retrieve an existing matching condition rather than
resubmit. Larger repeats require an explicit evidence/budget decision.

[dataset.jsonl](dataset.jsonl) pins both arms to task source
`5f441f92c526cb3e2ca77a395ac85bfdb4d0a89b`.
[pilot-ledger.json](pilot-ledger.json) explicitly records zero model runs,
the access preflights, and the fields required for duplicate-condition checking.
Agent/package/model remain unselected until accessibility is verified; do not
treat a requested model name as an available endpoint or a completed run.

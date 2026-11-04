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
staging index returned HTTP 403. After the user confirmed the exact model ID
`gpt-6.1-terra`, normal explicit-model submission succeeded without a discovery
override, proxy-bypass flag, CLI upgrade, or model substitution. Discovery failure
therefore did not prove that run submission was unavailable. Runtime model access
and actual execution are now verified from native model-call events.

Exactly two new runs were submitted, one per arm, with no repeats:

| Arm | Run |
|---|---|
| Raw scripted | [2026110483094426](https://msbenchapp.azurewebsites.net/run-analysis/2026110483094426) |
| Aspire CLI + existing skills | [2026110483115812](https://msbenchapp.azurewebsites.net/run-analysis/2026110483115812) |

Both request `gpt-6.1-terra`, package
`github-copilot-cli-pkg-main-20261014-215627`, vendor CLI `1.0.99-0`, one worker,
CES staging, fresh single-step conversation, and the same agent/verifier budgets.
Submission CLI/plugin/local Harbor are 0.3.67/0.0.28/0.20.0. Submission logs are
`.runs/agentic-research/terra-{raw,aspire}-submission.log`; wait/resume logs use
the same prefix. Admission is not evidence that the requested model ran.

[dataset.jsonl](dataset.jsonl) pins both arms to task source
`5f441f92c526cb3e2ca77a395ac85bfdb4d0a89b`.
[pilot-ledger.json](pilot-ledger.json) records the two run IDs, exact requested
conditions and their fingerprints. Fetch these runs rather than resubmitting
matching conditions.

## Completed Terra pilot

Both original attempts passed the protected functional grader with reward 1 and
no trial exception. Native `model.call_start` and `model.call_final_result`
identify `gpt-6.1-terra` in all 9 raw / 13 Aspire calls, each successful.
CLI provenance resolves `1.0.99-0` in both. The cloud tasks ran on Linux x86_64.

| Metric | Raw scripted | Aspire |
|---|---:|---:|
| Passed original attempts | 1/1 | 1/1 |
| Native Harbor agent elapsed seconds | 74.5 | 80.7 |
| MSBench CLI agent elapsed seconds | 71.3 | 76.7 |
| Model calls | 9 | 13 |
| Tool calls | 20 | 24 |
| Input tokens including cache | 140,283 | 264,796 |
| Cached input subset | 118,724 | 236,835 |
| Uncached input tokens | 21,559 | 27,961 |
| Output tokens | 3,457 | 3,960 |
| Runner-reported cost USD | 0.05016 | 0.06658 |

Primary timing is the native trial's `agent_execution` start/finish difference,
including the agent wrapper, not queue/setup/build/grading time. MSBench's
`msbench.agent_elapsed_time_sec` has narrower boundaries and is reported
separately, not mixed into that denominator. Costs are runner-reported estimates,
not independent billing; the two estimates sum to approximately USD 0.117,
excluding infrastructure and auxiliary analysis.

Both agents made the **same five-line proxy addition**, targeting the existing
`adminUrl`. Neither called Aspire CLI, loaded a skill, or restarted the backend
or dependencies. All eight Aspire skills were advertised in its actual prompt,
but none was invoked. Both primarily inspected frontend/backend code and
compared HTTP responses. The protected grader exercised fresh successful
import/call/status/clear and preserved state, beyond the agents' largely
read-only/negative-input checks.

Visible recoverable errors explain some extra work, without establishing a
causal timing effect: raw compared entire development exception bodies and
revised its check after request headers differed. Aspire additionally invoked
`rg` in Bash where the binary was missing (the dedicated `rg` tool remained
usable), compared request-specific error bodies, and then compared a transient
SignalR catalog snapshot before narrowing it to stable fields. These were
tool/check failures followed by recovery, not trial failures.

Both old pinned clients warned that the model catalog was unavailable and
selected default capability metadata/chat-completions wire. Native model-call
identifiers remained `gpt-6.1-terra`; no model substitution was observed.
This client-routing limitation remains part of the pilot provenance.

The wait/resume commands accidentally omitted `MSBENCH_DISABLE_RUN_ANALYSIS=1`.
After successful grading, optional automatic report analysis rejected an
unavailable `claude-sonnet-4.6` twice per run. It did not affect task grading,
change the task model, or trigger benchmark resubmission. Future resume/report/
extract commands must also set the disable-analysis variable; setting it only
on the original submission does not persist to later shell commands.

**Conclusion:** This first development pilot is feasible, but provides **no
demonstrated Aspire advantage**. It is one observation per arm, not a significance
test or a causal estimate of skill metadata cost. The already-running,
explicit-file frontend task did not naturally exercise Aspire's runtime tools.
Do not rerun identical conditions to seek a win. The next useful evidence is
a new D01 runtime diagnosis task where topology/logs/traces can matter.

[pilot-results.json](pilot-results.json) preserves exact metrics and native
result/trajectory SHA-256 values. Full raw evidence remains under
`.runs/msbench-cloud/agentic-i01/{raw,aspire}-extracted/`.

# Aspire startup ablation

This experiment isolates skills/MCP availability from the four-step Bingo
benchmark. It uses the same shared Aspire application, installed tools,
resources, and agent limits, but only asks for startup and endpoint discovery.
The original dataset and four-step task definitions are unchanged.

| Variant | Seven Aspire skills | Aspire MCP |
|---|---|---|
| `none` | Absent | Absent |
| `skills` | Installed for Harbor and native Copilot discovery | Absent |
| `mcp` | Absent | Declared for Harbor and project discovery |
| `skills-mcp` | Installed for Harbor and native Copilot discovery | Declared for Harbor and project discovery |

All cells receive exactly the same prompt and README recipe. The recipe uses
`aspire start`, waits for `boardadmin` and `bingoboard`, then matches
`resources[].displayName` and reads `urls[].url` to avoid isolation-suffix and
endpoint-schema mistakes. It is deliberately prescriptive: this measures the
cost/behavior of optional capabilities with a known workflow, not the ability
to discover how an unfamiliar application starts.

No application or skill snapshots are duplicated. Standard Docker named build
contexts fetch the existing common application and, only for skill-enabled
cells, the pinned skill snapshot. No-MCP images explicitly remove the shared
application's `.github/mcp.json`; omitting the task's MCP declaration alone
would not isolate that factor. The verifier checks treatment assets, immutable
inputs, real workspace-owned HTTP listeners, admin login, and player HTML.
It does not run the original final database/Redis workflow.

## Measurement

The identical shell recipe records four epoch-millisecond boundaries in
`benchmark-startup-timings.json`:

| Boundary | Observation |
|---|---|
| `launch_started_ms` | Immediately before `aspire start` |
| `launch_returned_ms` | Immediately after that command returns |
| `ready_ms` | After both `aspire wait` commands return |
| `endpoints_written_ms` | After endpoint JSON is written |

Report launch command time, subsequent readiness wait, endpoint extraction
time, and time outside the recipe separately. Use Harbor's `agent_execution`
interval as the full agent-time denominator. Setup/build/verifier/queue time
is excluded. The timestamps are agent-recorded cooperative measurements:
check them against trajectory/tool boundaries rather than treating their
valid shape as independent proof. A wait's completion is not a measurement
of the earliest instant the HTTP endpoint could have responded.

Compare three attempts per cell with the same pinned `gpt-6-luna` agent,
Copilot package/CLI version, and limits. Check actual skill/MCP calls in each
trajectory: availability does not guarantee consumption. Analyze this
startup-only experiment independently of the older multi-step totals.

## Standard commands

Validate local images without inference:

```bash
export MSBENCH_ASPIRE_APP_CONTEXT="$PWD/msbench/bingo/common/aspire-app"
export MSBENCH_ASPIRE_SKILLS_CONTEXT="$PWD/msbench/bingo/tasks/aspire/environment/skills"
harbor run -p msbench/aspire-startup/tasks/none -a oracle -e docker -n 1
harbor run -p msbench/aspire-startup/tasks/skills -a oracle -e docker -n 1
harbor run -p msbench/aspire-startup/tasks/mcp -a oracle -e docker -n 1
harbor run -p msbench/aspire-startup/tasks/skills-mcp -a oracle -e docker -n 1
unset MSBENCH_ASPIRE_APP_CONTEXT MSBENCH_ASPIRE_SKILLS_CONTEXT
node --test msbench/aspire-startup/experiment.test.mjs
```

Once task sources are committed/pushed and the dataset pins that task commit:

```bash
export USE_COPILOT_CLI_VERSION=1.0.99-0
MSBENCH_DISABLE_RUN_ANALYSIS=1 msbench-cli run \
  --dataset msbench/aspire-startup/dataset.jsonl \
  --benchmark aspire-startup --variant none \
  --agent github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 \
  --model gpt-6-luna --env USE_COPILOT_CLI_VERSION \
  --backend ces-staging --acr msbenchstaging.azurecr.io \
  --workers 1 --repeat 3
unset USE_COPILOT_CLI_VERSION
```

Repeat with `skills`, `mcp`, and `skills-mcp`. These one-step tasks do not test
conversation continuation. That requires a separate multi-step runtime probe:
successful execution, receipt of every new instruction, and an actual reloaded
session/history must all be demonstrated. Preserving `OUTPUT_DIR`, reusing the
workspace, or setting `--harbor-resume-trajectory` alone is insufficient.

## Continuation retry with MSBench 0.3.67

Probe [2026102173182342](https://msbenchapp.azurewebsites.net/run-analysis/2026102173182342)
retried the existing four-step Aspire task after the CLI upgrade, using the
current standard package rather than a custom runner. It resolved
`github-copilot-cli-pkg-main-20261021-184958` and CLI `1.0.102`.
The first agent invocation exited with code 1 before any model tool call;
the available error reported only `Copilot CLI process exited with code 1`.
The subsequent three invocations found `/output/.runner-lock` and exited
without processing their instructions. All step rewards were 0.

This is an agent-runtime failure, not application/model failure, and not a
valid continuation-performance sample. Upgrading the submission CLI did not
produce a working resumed session in this probe. Do not remove the lock and
claim continuation: the runner must reload the actual model session as well.
The paired fresh-versus-continuation arm remains blocked pending a runner
with verified session reload (or an explicitly selected custom adapter).
Keep this diagnostic probe out of startup-ablation aggregates; those use
the previously working pinned package and CLI version.

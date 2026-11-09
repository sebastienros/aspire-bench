# Results: does Aspire help an agent fix a misbehaving app?

Status as of 2026-11-09. Rounds 1, 2 and 5 are complete: **229 model trials** (223
graded, 6 infrastructure failures), all on the requested model, all on the pinned
agent, none touching grader paths. Rounds 3 and 4 (CLI output patch, cold start, extra
sol replicates; 111 trials) were submitted and still queued for cloud image builds when
this was written. Sections that depend on them
say so. `tools/await-rounds.sh r3 r4 r5` rebuilds every table when they finish.

Full tables: [results/comparison.md](results/comparison.md). Significance tests:
[results/stats.md](results/stats.md). Per-trial rows with run IDs, URLs and artifact
hashes: [results/trials.jsonl](results/trials.jsonl).

## Answer

1. **With the skills and MCP server that ship today, an aspirified app is slower and
   more expensive for an agent to diagnose than the same app without Aspire.** This
   holds on all three models and is statistically significant on luna and terra
   (p ≤ 0.004 for time, tokens and cost in every cell). On luna it also lowers the
   success rate.
2. **A focused skill set removes that penalty.** With one new skill, the router
   removed and one description narrowed, the aspirified app is 29% to 66% faster and
   uses 55% to 81% fewer input tokens than with the shipped skills + MCP
   (p ≤ 0.004 in every luna and terra cell).
3. **Against the raw app, the improved Aspire setup wins on the cheapest model and
   reaches parity on the stronger ones.** On luna, `slow-sql`: −34% time, −48% input
   tokens, −39% cost (p = 0.04, 0.01, 0.01; 9 vs 12). On luna, `read-only`: −16%,
   −25%, −20%, not significant (p = 0.11, 0.19, 0.08; 12 vs 9). On terra and sol:
   parity, and 13% slower on terra `slow-sql`. These two faults leave evidence in the
   raw app's log file too, and the stronger models read it about as fast as they read
   traces.
4. **MCP output size is a product problem, not a skill problem.** Every `list_traces`,
   `list_structured_logs` and `list_console_logs` call returns about 32 KB. A patch
   that returns trace summaries cut agent time by 6% to 36% in all eight measured cells.

## Product comparison: raw app vs aspirified app

Medians; n per cell is 6 (luna `raw`/`aspire-lean`: 9 to 12, sol: 3 to 5). Percentages
are against `raw`. Infrastructure failures (6, all luna round 5: five `403 Forbidden`
model calls, one agent-package download reset) are excluded from every cell.

| Scenario / model | `raw` | Shipped: `aspire-skills-mcp` | Proposed: `aspire-lean` |
|---|---|---|---|
| `slow-sql` / luna | 132 s · 492k tok · $0.015 · 12/12 | 262 s (+97%) · 1.49M tok (+204%) · $0.033 · 6/6 | 87 s (−34%) · 255k tok (−48%) · $0.009 · 9/9 |
| `read-only` / luna | 105 s · 444k tok · $0.013 · 9/9 | 254 s (+141%) · 1.52M tok (+242%) · $0.033 · **2/6** | 89 s (−16%) · 335k tok (−25%) · $0.011 · 12/12 |
| `slow-sql` / terra | 54 s · 164k tok · $0.054 · 6/6 | 87 s (+59%) · 556k tok (+239%) · $0.100 · 6/6 | 61 s (+13%) · 215k tok (+31%) · $0.056 · 6/6 |
| `read-only` / terra | 56 s · 200k tok · $0.060 · 6/6 | 72 s (+28%) · 449k tok (+125%) · $0.088 · 6/6 | 52 s (−8%) · 202k tok (+1%) · $0.051 · 6/6 |
| `slow-sql` / sol | 64 s · 168k tok · $0.103 · 3/3 | 73 s (+14%) · 385k tok (+129%) · $0.160 · 3/3 | 60 s (−5%) · 190k tok (+13%) · $0.096 · 3/3 |
| `read-only` / sol | 54 s · 179k tok · $0.115 · 3/3 | 61 s (+14%) · 328k tok (+84%) · $0.147 · 3/3 | 57 s (+6%) · 236k tok (+32%) · $0.130 · 5/5 |

What is and is not established:

| Comparison | Result |
|---|---|
| Shipped skills + MCP vs raw | Worse on time, tokens and cost in all six cells. p ≤ 0.004 in the four luna and terra cells. |
| Proposed vs shipped skills + MCP | Better in all six cells. p ≤ 0.004 in the four luna and terra cells. |
| Proposed vs raw, luna | `slow-sql`: −34% time, −48% tokens, −39% cost, p = 0.04 / 0.01 / 0.01 (9 vs 12). `read-only`: −16% / −25% / −20%, p = 0.11 / 0.19 / 0.08 (12 vs 9). |
| Proposed vs raw, terra | `slow-sql`: 13% slower (7 s) and 31% more tokens, p = 0.02. `read-only`: no difference. |
| Proposed vs raw, sol | No detectable difference at 3 trials per arm. |

### Success rate

Every graded trial passed except on luna, `read-only`:

| Arm | Root cause removed | Application works again |
|---|---:|---:|
| `raw` | 9/9 | 9/9 |
| `aspire-lean` | 12/12 | 12/12 |
| `aspire-skills` (no MCP) | 3/3 | 3/3 |
| `aspire-mcp` (no skills) | 1/3 | 2/3 |
| `aspire-skills-mcp` | 2/6 | 4/6 |

The failures are informative. Agents on the MCP arms read the "cannot execute … in a
read-only transaction" error from 30 to 45 KB log responses and patched the
**application** to force its own sessions read-write, without ever opening the
database. The database stays read-only for every other client, so the verifier's
root-cause check fails. Two trials did not restore writes at all. The agents that
passed went to the database with `psql` and reset the setting there.

## Where the time goes

Median seconds from the agent's first event (luna, `slow-sql`):

| Arm | Root cause on screen | First repair command | Done |
|---|---:|---:|---:|
| `raw` | 25 | 62 | 132 |
| `aspire-cli` (no skills) | 77 | 128 | 191 |
| `aspire-skills` | 58 | 95 | 178 |
| `aspire-skills-mcp` | 105 | 161 | 262 |
| `aspire-lean` | 26 | 53 | 87 |

With the new skill the agent finds the cause as fast as the raw-app agent and
finishes sooner: it goes from cause to repair faster and verifies with the same trace
filter instead of generating requests and re-reading logs. Without a skill, an Aspire agent takes three times as
long to find the cause: it has more surfaces to explore and no recipe.

Mean tool output read per trial (luna, `slow-sql`, round 1, 3 trials per arm), by source:

| Arm | Source files | Aspire CLI | Aspire MCP | Log files | Database |
|---|---:|---:|---:|---:|---:|
| `raw` | 116 KB | - | - | 45 KB | 14 KB |
| `aspire-skills-mcp` | 217 KB | - | 305 KB | - | 7 KB |
| `aspire-lean` | 36 KB | 75 KB | - | - | 9 KB |

Telemetry replaces two thirds of the source reading. But 57 KB of the 75 KB that the
lean agent reads from the Aspire CLI is two table commands (`aspire describe` and the
trace list) whose box-drawing borders and per-row dashboard URLs carry no information
for an agent. That is the motivation for the CLI patch below.

## Skills ablation (same aspirified app)

Luna, medians, 3 to 6 trials:

| Arm | `slow-sql` | `read-only` | Skill actually loaded |
|---|---|---|---|
| `aspire-cli` (none) | 191 s · 910k tok | 171 s · 803k tok | - |
| `aspire-skills` (shipped) | 178 s · 759k tok | 207 s · 1.22M tok | none in 4 of 6 trials |
| `aspire-plus` (shipped + `aspire-diagnose`) | 133 s · 390k tok | 167 s · 799k tok | `aspire-diagnose` in 4 of 6 |
| `aspire-lean` (proposed) | 87 s · 255k tok | 89 s · 335k tok | `aspire-diagnose` in 21 of 21 |

On luna the shipped skills are no better than no skills, because luna mostly does not
load them. Adding the new skill next to the router helps only when it wins selection.
Removing the router makes selection reliable. On terra the shipped skills load
`aspire-monitoring` every time and are still 27% to 31% slower than `aspire-lean`.
Details and the design rules that follow are in [SKILLS-PROPOSAL.md](SKILLS-PROPOSAL.md).

## MCP: shipped tools vs compact-telemetry patch

Both arms use an Aspire CLI built from source at the daily build's commit; the patched
arm differs only by [0001-mcp-compact-telemetry.patch](upstream/0001-mcp-compact-telemetry.patch).
Medians over 3 trials per arm.

| Scenario / model | MCP only: control → patched | Lean skills + MCP: control → patched |
|---|---|---|
| `slow-sql` / luna | 182 s → 117 s (−36%) · 1.07M → 409k tok (−62%) | 140 s → 95 s (−32%) · 453k → 412k tok (−9%) |
| `slow-sql` / terra | 90 s → 59 s (−34%) · 394k → 309k tok (−21%) | 70 s → 65 s (−6%) · 226k → 266k tok (+18%) |
| `read-only` / luna | 149 s → 126 s (−16%) · 793k → 731k tok (−8%) | 123 s → 111 s (−9%) · 563k → 557k tok (−1%) |
| `read-only` / terra | 79 s → 58 s (−27%) · 462k → 378k tok (−18%) | 61 s → 50 s (−17%) · 341k → 365k tok (+7%) |

The patch is faster in all eight cells. With 3 trials per arm no single cell can reach
significance (the floor is p = 0.10, reached in three of them), so this is a consistent
direction, not yet a proven effect size. The token saving is large when MCP is the
agent's main route and absent when the lean skill already steers it to bounded CLI
commands.

What the patch changes, measured on the live `slow-sql` incident:

| MCP call | Shipped | Patched |
|---|---:|---:|
| `list_traces {}` | 31,797 chars | 8,988 chars |
| `list_traces {search: "duration:>500", limit: 5}` | 29,981 chars | 2,854 chars, and each summary names the slowest span and its SQL |
| `list_structured_logs {}` | 32,630 chars | 14,455 chars |
| `list_structured_logs {severity: "Error"}` | not available | 734 chars |

Not changed and still large: `list_resources` (10,321 chars for 8 resources, mostly
command descriptions) and `list_console_logs` (34,676 chars). Both are worth the same
treatment.

## CLI: plain output when redirected

[0002-cli-plain-output.patch](upstream/0002-cli-plain-output.patch) (13 lines) drops
table borders and per-row dashboard links when output is not a terminal.

| Command | Shipped | Patched |
|---|---:|---:|
| `aspire describe` | 4,244 bytes | 1,086 bytes (−74%) |
| `aspire otel traces -n 15 --search "duration:>500"` | 6,863 bytes | 1,561 bytes (−77%) |
| `aspire otel spans -n 20` | 3,327 bytes | 1,399 bytes (−58%) |

Agent-level effect (`aspire-lean-plain` vs `aspire-lean-src`, and all changes together
in `aspire-lean-mcp-all`): **round 3, queued.** See `results/comparison.md` once
`tools/await-rounds.sh` has run.

## Cold start

Scenario `cold-start`: nothing is running; the agent must bring the app up. Arms:
`raw`, `aspire-cli`, `aspire-skills`, `aspire-lean`, and `aspire-lean-start` (adds the
new [`aspire-start`](common/skills/start/aspire-start/SKILL.md) skill). Both local
reference starts pass the verifier (raw 8 s, Aspire 14 s with warm caches).
**Round 4, queued.**

## Integrity

- Models: every graded trial's `model.call_start` events name only the requested model
  (109 luna, 90 terra, 24 sol). Copilot CLI `1.0.99-0` in all 223.
- Six luna trials in round 5 ended in a runner exception before grading (five
  `X_403_MODEL_CALL_FAILURE` from the model service, one agent-package download reset).
  They are in `trials.jsonl` with `infrastructure_failure: true` and in no other number.
- No tool call in any trial referenced `/opt/benchmark`, the solution, the tests or
  the verifier logs.
- Before any model ran, each fault was validated on both app kinds: the verifier fails
  on the broken state and passes after the reference repair, locally and in the cloud
  (6 remote no-model gates completed, all reward 1; 3 more queued with rounds 3 and 4).
- No graded trial was discarded. `aspire-lean-mcp` / `slow-sql` / luna has 4 trials
  because the pipeline probe ran the identical cell and is included.
- Runner-reported model cost for the 223 graded trials: USD 11.56.

## Limits

- One application and two database-side faults. Both faults leave a signal in the raw
  app's own log file (EF Core logs command durations and exceptions), which is why the
  raw baseline is strong here. A fault with no log signal, or one that spans services,
  is the obvious next scenario and the one most likely to separate the two.
- The aspirified app has PostgreSQL client tracing; the raw app has no tracing. The
  product comparison therefore combines instrumentation with tooling.
- The source-built CLI arms are managed builds, not NativeAOT like the daily. They are
  only ever compared with each other.
- The `read-only` verifier separates "root cause removed" from "application works"
  from round 2 on. Round-1 failures were classified from their failure text.
- Fresh single-turn conversations only. One agent harness (Copilot CLI).

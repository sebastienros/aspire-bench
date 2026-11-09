# Results: does Aspire help an agent fix a misbehaving app?

Status as of 2026-11-09, all rounds complete: **354 model trials** (348 graded, 6
infrastructure failures) over three scenarios, sixteen arms and three models, all on
the requested model, all on the pinned agent, none touching grader paths. Rounds 3
and 4 sat unstarted in the cloud scheduler for over two hours; they were cancelled and
resubmitted unchanged as rounds `r3b` and `r4b` (see Integrity).

Full tables: [results/comparison.md](results/comparison.md). Significance tests:
[results/stats.md](results/stats.md). Per-trial rows with run IDs, URLs and artifact
hashes: [results/trials.jsonl](results/trials.jsonl).

## Answer

1. **With the skills and MCP server that ship today, an aspirified app is slower and
   more expensive for an agent to diagnose than the same app without Aspire.** This
   holds on all three models: tokens and cost are higher with p ≤ 0.004 in every
   cell, time with p ≤ 0.004 on luna and terra and p = 0.03 on sol `slow-sql` (sol
   `read-only`: +3%, not significant). On luna it also lowers the success rate.
2. **A focused skill set removes that penalty.** With one new skill, the router
   removed and one description narrowed, the aspirified app is 11% to 67% faster and
   uses 35% to 83% fewer input tokens than with the shipped skills + MCP
   (p ≤ 0.004 in every luna and terra cell and on sol `slow-sql`).
3. **Against the raw app, the improved Aspire setup wins on the cheapest model and
   reaches parity on the stronger ones.** On luna, `slow-sql`: −34% time, −48% input
   tokens, −39% cost (p = 0.04, 0.01, 0.01; 9 vs 12). On luna, `read-only`: −16%,
   −25%, −20%, not significant (p = 0.11, 0.19, 0.08; 12 vs 9). On terra and sol
   (6 vs 6): time within −8% to +13%, with 17% to 31% more input tokens in three of
   four cells. These two faults leave evidence in the raw app's log file too, and the
   stronger models read it about as fast as they read traces.
4. **MCP output size is a product problem, not a skill problem.** Every `list_traces`,
   `list_structured_logs` and `list_console_logs` call returns about 32 KB. A patch
   that returns trace summaries cut agent time by 6% to 36% in all eight measured
   cells. With that patch, lean skills + MCP is faster than the same arm on the shipped
   tool shape in all four luna and terra cells (−12% to −32%) and at or below the raw
   app in five of six cells, and the agent switches to MCP as its main route.
5. **CLI table borders and dashboard links are bytes, not time.** Dropping them when
   output is redirected cuts what the lean agent reads from tools by 21% to 59%, but
   agent time moves only −12% to +1% and tokens −23% to +2% (3 trials per arm, none
   significant). Worth shipping for the context it saves; not a speed-up by itself.
6. **Cold start is where Aspire costs time, and no skill recovers it.** Every Aspire
   arm brings the app up 19% to 63% slower than the raw app's one start script, with
   the bare CLI as fast as any skill set. The new `aspire-start` skill is selected
   9 of 9 and removes a regression that removing the router caused on luna
   (82 s → 51 s), which makes it a required part of the proposed set rather than a win.

## Product comparison: raw app vs aspirified app

Medians; n per cell is 6 (luna `raw`/`aspire-lean`: 9 to 12). Percentages
are against `raw`. Infrastructure failures (6, all luna round 5: five `403 Forbidden`
model calls, one agent-package download reset) are excluded from every cell.

| Scenario / model | `raw` | Shipped: `aspire-skills-mcp` | Proposed: `aspire-lean` |
|---|---|---|---|
| `slow-sql` / luna | 132 s · 492k tok · $0.015 · 12/12 | 262 s (+97%) · 1.49M tok (+204%) · $0.033 · 6/6 | 87 s (−34%) · 255k tok (−48%) · $0.009 · 9/9 |
| `read-only` / luna | 105 s · 444k tok · $0.013 · 9/9 | 254 s (+141%) · 1.52M tok (+242%) · $0.033 · **2/6** | 89 s (−16%) · 335k tok (−25%) · $0.011 · 12/12 |
| `slow-sql` / terra | 54 s · 164k tok · $0.054 · 6/6 | 87 s (+59%) · 556k tok (+239%) · $0.100 · 6/6 | 61 s (+13%) · 215k tok (+31%) · $0.056 · 6/6 |
| `read-only` / terra | 56 s · 200k tok · $0.060 · 6/6 | 72 s (+28%) · 449k tok (+125%) · $0.088 · 6/6 | 52 s (−8%) · 202k tok (+1%) · $0.051 · 6/6 |
| `slow-sql` / sol | 63 s · 163k tok · $0.104 · 6/6 | 72 s (+15%) · 362k tok (+122%) · $0.149 · 6/6 | 60 s (−6%) · 191k tok (+17%) · $0.099 · 6/6 |
| `read-only` / sol | 61 s · 180k tok · $0.119 · 6/6 | 63 s (+3%) · 345k tok (+92%) · $0.151 · 6/6 | 56 s (−8%) · 225k tok (+25%) · $0.125 · 6/6 |

What is and is not established:

| Comparison | Result |
|---|---|
| Shipped skills + MCP vs raw | Worse on time, tokens and cost in all six cells. Tokens and cost: p ≤ 0.004 in all six. Time: p ≤ 0.004 on luna and terra, p = 0.03 on sol `slow-sql`, not significant on sol `read-only` (+3%). |
| Proposed vs shipped skills + MCP | Better on time, tokens and cost in all six cells. p ≤ 0.004 on luna, terra and sol `slow-sql`. Sol `read-only`: −11% / −35% / −17%, p = 0.49 / 0.09 / 0.07. |
| Proposed vs raw, luna | `slow-sql`: −34% time, −48% tokens, −39% cost, p = 0.04 / 0.01 / 0.01 (9 vs 12). `read-only`: −16% / −25% / −20%, p = 0.11 / 0.19 / 0.08 (12 vs 9). |
| Proposed vs raw, terra | `slow-sql`: 13% slower (7 s) and 31% more tokens, p = 0.02. `read-only`: no difference. |
| Proposed vs raw, sol | Time −6% / −8%, not significant. Tokens +17% (p = 0.04) / +25% (p = 0.07). 6 vs 6. |

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

Agent-level effect, `aspire-lean-plain` against the `aspire-lean-src` control (same
source-built CLI without the patch; 3 trials per arm, 4 for the terra `slow-sql`
control). "Read" is the characters returned to the model by all tool calls in a trial.

| Scenario / model | Read by the agent | Agent time | Input tokens | Cost |
|---|---|---|---|---|
| `slow-sql` / luna | 154k → 107k (−31%) | 95 s → 84 s (−12%) | 302k → 271k (−10%) | −9% |
| `slow-sql` / terra | 104k → 42k (−59%) | 61 s → 62 s (+1%) | 199k → 174k (−12%) | −12% |
| `slow-sql` / sol | 110k → 76k (−31%) | 59 s → 59 s (−1%) | 192k → 185k (−4%) | −3% |
| `read-only` / luna | 135k → 100k (−26%) | 94 s → 86 s (−9%) | 400k → 383k (−4%) | +9% |
| `read-only` / terra | 88k → 68k (−23%) | 62 s → 61 s (−2%) | 270k → 275k (+2%) | +1% |
| `read-only` / sol | 139k → 109k (−21%) | 58 s → 55 s (−5%) | 255k → 197k (−23%) | −19% |

The agent reads a quarter to a half less, and the direction is consistent (time at or
below the control in five of six cells, tokens in five of six), but the effect is small
and no cell is significant at three trials. The lean skill already keeps every CLI call
bounded, so borders and links are a minor share of what a trial spends; most input
tokens are the conversation prefix re-sent on each model call, which this patch does
not shrink. It is worth shipping for the context it frees, not as a speed-up.

**All product changes together.** `aspire-lean-mcp-all` (lean skills, MCP, both
patches) against `aspire-lean-mcp-src` (lean skills, MCP, unpatched source build):

| Scenario / model | Agent time | Input tokens | MCP calls → CLI calls (median) |
|---|---|---|---|
| `slow-sql` / luna | 140 s → 95 s (−32%) | 453k → 287k (−37%) | 3 → 1 MCP, 7 → 7 CLI |
| `slow-sql` / terra | 70 s → 62 s (−12%) | 226k → 219k (−3%) | 2 → 5 MCP, 4 → 1 CLI |
| `read-only` / luna | 123 s → 89 s (−28%) | 563k → 487k (−14%) | 10 → 10 MCP, 6 → 1 CLI |
| `read-only` / terra | 61 s → 48 s (−22%, p = 0.06) | 341k → 291k (−15%) | 3 → 8.5 MCP, 7 → 1 CLI |

Faster in all four cells. With compact telemetry the agent makes MCP its main route
(one CLI call per trial, typically `aspire describe`), which it did not do with the
shipped tool shape. Against the raw app this arm is −28% / −16% (luna), +13% / −15%
(terra) and −10% / −33% (sol) on time for `slow-sql` / `read-only`: at or below raw in
five of six cells, 3 trials per cell, p between 0.05 and 0.5.

## Cold start

Scenario `cold-start`: nothing is running; the agent must bring the app up. Arms:
`raw`, `aspire-cli`, `aspire-skills`, `aspire-lean`, and `aspire-lean-start` (adds the
new [`aspire-start`](common/skills/start/aspire-start/SKILL.md) skill). Both local
reference starts pass the verifier (raw 8 s, Aspire 14 s with warm caches). Medians
over 3 trials per cell; all 45 trials passed.

| Model | `raw` | `aspire-cli` | `aspire-skills` | `aspire-lean` | `aspire-lean-start` |
|---|---|---|---|---|---|
| luna | 41 s · 64k tok | 49 s (+19%) · 72k | 52 s (+25%) · 126k | **82 s (+100%) · 249k** | 51 s (+23%) · 116k |
| terra | 33 s · 35k tok | 51 s (+54%) · 75k | 53 s (+58%) · 83k | 51 s (+53%) · 122k | 54 s (+63%) · 116k |
| sol | 40 s · 62k tok | 50 s (+24%) · 70k | 50 s (+26%) · 121k | 56 s (+39%) · 120k | 54 s (+35%) · 114k |

- **Aspire costs time on a cold start, whatever the skills.** The raw agent runs the
  app's start script and one or two `curl`s (2 to 3 shell calls). Every Aspire agent
  runs `aspire start`, waits with `aspire wait` for both endpoints, then needs
  `aspire describe` to learn the URLs before it can verify (4 to 8 shell calls), and
  the start itself is slower (14 s against 8 s locally). The CLI with no skills is as
  fast as any skill set; skills add 10 to 30 KB of reading and no step the CLI arm did
  not already find.
- **Removing the router left "start the app" without an owner, and luna paid for it.**
  In `aspire-lean`, luna loaded `aspire-orchestration` in 3 of 3 trials and then
  followed its references (`detection.md` 13 KB, `app-commands.md` 16 KB) and a
  `git status` / `git worktree list` / `aspire ps` detection sequence before starting
  anything: 82 s and 249k tokens, twice the raw app. With the shipped set luna loaded
  the same skill but did not read the references (52 s). Terra and sol were unaffected.
- **`aspire-start` repairs that and nothing more.** Selected in 9 of 9 trials; on luna
  51 s (−38%) and 116k tokens (−54%) against `aspire-lean`, back level with the shipped
  skills (−2%) and the bare CLI; on terra and sol within noise of every Aspire arm. It
  is a required companion of the router's removal, not a speed-up over what ships.
- The remaining gap to the raw app is in the product, not the skills: a start command
  that blocks until the resources are ready and prints their endpoints would remove
  the `wait` and `describe` steps that every Aspire trial ran.

## Integrity

- Models: every graded trial's `model.call_start` events name only the requested model
  (142 luna, 125 terra, 81 sol). Copilot CLI `1.0.99-0` in all 348.
- Six luna trials in round 5 ended in a runner exception before grading (five
  `X_403_MODEL_CALL_FAILURE` from the model service, one agent-package download reset).
  They are in `trials.jsonl` with `infrastructure_failure: true` and in no other number.
- Rounds 3 and 4 (111 runs) were accepted by the cloud scheduler but had not started
  after two hours. All of them were cancelled; two had already produced a trial and
  those are included (hence 4 trials in `aspire-lean-src` / `slow-sql` / terra and
  `aspire-lean-mcp-all` / `read-only` / terra). The same cells were resubmitted
  unchanged as rounds `r3b` (78 runs) and `r4b` (45 runs) and ran at once. Cancelled
  entries stay in `ledger.jsonl` with `cancelled: true` and are never fetched.
- No tool call in any trial referenced `/opt/benchmark`, the solution, the tests or
  the verifier logs.
- Before any model ran, each fault was validated on both app kinds: the verifier fails
  on the broken state and passes after the reference repair, locally and in the cloud.
  Six remote no-model gates completed with reward 1. The three gates submitted with
  rounds 3 and 4 (`aspire-lean-plain` / `slow-sql`, `raw` and `aspire-lean-start` /
  `cold-start`) ended without producing a result and were resubmitted at 22:17 UTC;
  those cells had passed the local fail/repair/pass gate before the model runs.
- No graded trial was discarded. `aspire-lean-mcp` / `slow-sql` / luna has 4 trials
  because the pipeline probe ran the identical cell and is included.
- Runner-reported model cost for the 348 graded trials: USD 19.45.

## Limits

- One application and two database-side faults. Both faults leave a signal in the raw
  app's own log file (EF Core logs command durations and exceptions), which is why the
  raw baseline is strong here. A fault with no log signal, or one that spans services,
  is the obvious next scenario and the one most likely to separate the two.
- The aspirified app has PostgreSQL client tracing; the raw app has no tracing. The
  product comparison therefore combines instrumentation with tooling.
- The source-built CLI arms are managed builds, not NativeAOT like the daily. They are
  only ever compared with each other.
- The patch arms, the all-changes arm and every cold-start cell have 3 trials per arm,
  where the smallest attainable p is 0.10. Those sections report direction and
  magnitude, not significance.
- The `read-only` verifier separates "root cause removed" from "application works"
  from round 2 on. Round-1 failures were classified from their failure text.
- Fresh single-turn conversations only. One agent harness (Copilot CLI).

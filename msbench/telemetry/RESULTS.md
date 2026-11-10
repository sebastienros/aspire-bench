# Results: does Aspire help an agent fix a misbehaving app?

Status as of 2026-11-10, rounds 1 to 7b complete: **467 model trials** (461 graded, 6
infrastructure failures) over three diagnosis scenarios and a cold start, seventeen arms
and three models, all on the requested model, all on the pinned agent, none touching
grader paths. Runner-reported model cost: USD 26.34.

Two things changed after round 5 and both are folded in below. A third scenario,
`slow-redis`, was added whose cause leaves **nothing** in the standard app's log. And the
standard app's extra `scripts/check.sh` health script was removed, because an ordinary
application does not ship one; the `raw` baseline was re-run without it (rounds 7 and 7b)
and the earlier raw trials are kept as `raw-check`. Every comparison below is against
the re-run `raw`.

Full tables: [results/comparison.md](results/comparison.md). Significance tests:
[results/stats.md](results/stats.md). Per-trial rows with run IDs, URLs and artifact
hashes: [results/trials.jsonl](results/trials.jsonl).

## Answer

1. **With the skills and MCP server that ship today, an aspirified app is slower and
   more expensive for an agent to diagnose than the same app without Aspire**, on every
   model, whenever the standard app's log carries the evidence. On `slow-sql` and
   `read-only`: +35% to +228% agent time and +96% to +356% input tokens (tokens and
   cost p ≤ 0.004 in all six cells; time p ≤ 0.004 in five). On luna it also lowers the
   success rate (`read-only` root cause removed in 2 of 6).
2. **A focused skill set removes that penalty.** With one new skill, the router removed
   and one description narrowed, the aspirified app is 11% to 67% faster and uses 35%
   to 83% fewer input tokens than with the shipped skills + MCP in all nine
   scenario × model cells (p ≤ 0.004 in the seven cells with six or more trials per arm).
3. **Against the raw app, it depends on where the evidence is.** When the fault leaves a
   line in the app's own log (`slow-sql`: EF Core logs the slow command; `read-only`:
   the exception), the proposed set reaches **parity**: −3% to +16% on time in all six
   cells, none significant; 26% fewer tokens on luna `slow-sql`, 23% to 28% more on
   terra and sol `slow-sql`. The luna advantage reported after round 5 (−34% time) was an
   artefact of the raw app's check script and is withdrawn (see Baseline).
4. **When the fault leaves nothing in the log, Aspire's telemetry plus the skill is
   decisive.** On `slow-redis` the proposed set fixed the incident in 5 of 6 luna trials
   against 1 of 8 for the raw app and 0 of 6 for both the bare Aspire CLI and the shipped
   skills + MCP; it was 41% faster (p = 0.005). On terra and sol every arm passed, and the
   proposed set took 63 s and 66 s against 196 s and 119 s for the raw app (−68%, −45%;
   3 vs 3). Every failing luna agent patched the application; every lean agent went from
   the trace to the cache's `SLOWLOG` and stopped the offending client.
5. **MCP output size is a product problem, not a skill problem.** Every `list_traces`,
   `list_structured_logs` and `list_console_logs` call returns about 32 KB. A patch that
   returns trace summaries cut agent time by 6% to 36% in all eight measured cells, and
   with it lean skills + MCP beat the same arm on the shipped tool shape in all four
   luna and terra cells. On `slow-redis`, however, the MCP route cost luna: with MCP
   available, 2 of 6 agents never looked at the cache (3 of 6 passed against 5 of 6 for
   the CLI-only lean set).
6. **CLI table borders and dashboard links are bytes, not time.** Dropping them when
   output is redirected cuts what the lean agent reads from tools by 21% to 59%, but
   agent time moves only −12% to +1% (3 trials per arm, none significant).
7. **Cold start is where Aspire costs time, and no skill recovers it.** Every Aspire arm
   brings the app up 15% to 56% slower than the raw app's one start script. The new
   `aspire-start` skill is selected 9 of 9 and repairs the regression that removing the
   router caused on luna (82 s → 51 s); it does not beat the bare CLI.
8. **A benchmark lesson:** the raw app's `scripts/check.sh` made the raw baseline
   *slower* on luna (−36% `slow-sql`, −26% `read-only` without it) and on sol `slow-sql`
   (−15%), with no effect on terra. Convenience scripts in a baseline are not neutral.

## Baseline: the raw app with and without `check.sh`

Rounds 1 to 5 ran the standard app with a `scripts/check.sh` health script next to
`start.sh`; 34 of 45 raw diagnosis trials ran it. Rounds 7 and 7b re-ran the same cells
without it. Medians; "raw" is the current baseline.

| Scenario / model | `raw` (no check script) | `raw-check` (rounds 1–5) |
|---|---|---|
| `slow-sql` / luna | 84 s · 343k tok · $0.011 · 8/9 | 132 s (+57%) · 492k tok (+44%) · $0.015 · 12/12 |
| `slow-sql` / terra | 53 s · 173k tok · $0.054 · 6/6 | 54 s (+3%) · 164k tok (−5%) · $0.054 · 6/6 |
| `slow-sql` / sol | 53 s · 155k tok · $0.099 · 6/6 | 63 s (+18%) · 163k tok (+5%) · $0.104 · 6/6 |
| `read-only` / luna | 77 s · 333k tok · $0.011 · 9/9 | 105 s (+36%) · 444k tok (+33%) · $0.013 · 9/9 |
| `read-only` / terra | 51 s · 198k tok · $0.058 · 6/6 | 56 s (+11%) · 200k tok (+1%) · $0.060 · 6/6 |
| `read-only` / sol | 55 s · 176k tok · $0.118 · 6/6 | 61 s (+10%) · 180k tok (+2%) · $0.119 · 6/6 |
| `cold-start` (3 models) | 36 to 43 s | 33 to 41 s |

Without the script the raw agent is faster on luna (`read-only` p = 0.024, `slow-sql`
p = 0.17) and on sol `slow-sql` (p = 0.04), unchanged on terra and on cold start. The
luna agent found the cause sooner (19 s against 25 s on `slow-sql`) and spent less time
verifying. One luna `slow-sql` trial failed without the script (a workaround that left
writes at 2.4 s); all twelve had passed with it.

## Product comparison: raw app vs aspirified app

Medians; n per cell is 6 to 12 on luna and terra `slow-sql` / `read-only`, 6 on sol, 3
on terra and sol `slow-redis`, 6 to 8 on luna `slow-redis`. Percentages are against
`raw`. Infrastructure failures (6, all luna round 5) are excluded from every cell.

| Scenario / model | `raw` | Shipped: `aspire-skills-mcp` | Proposed: `aspire-lean` |
|---|---|---|---|
| `slow-sql` / luna | 84 s · 343k tok · $0.011 · 8/9 | 262 s (+210%) · 1.49M tok (+336%) · $0.033 · 6/6 | 87 s (+3%) · 255k tok (−26%) · $0.009 (−22%) · 9/9 |
| `slow-sql` / terra | 53 s · 173k tok · $0.054 · 6/6 | 87 s (+65%) · 556k tok (+221%) · $0.100 · 6/6 | 61 s (+16%) · 215k tok (+24%) · $0.056 · 6/6 |
| `slow-sql` / sol | 53 s · 155k tok · $0.099 · 6/6 | 72 s (+35%) · 362k tok (+134%) · $0.149 · 6/6 | 60 s (+11%) · 191k tok (+23%) · $0.099 · 6/6 |
| `read-only` / luna | 77 s · 333k tok · $0.011 · 9/9 | 254 s (+228%) · 1.52M tok (+356%) · $0.033 · **2/6** | 89 s (+15%) · 335k tok (+1%) · $0.011 · 12/12 |
| `read-only` / terra | 51 s · 198k tok · $0.058 · 6/6 | 72 s (+42%) · 449k tok (+127%) · $0.088 · 6/6 | 52 s (+2%) · 202k tok (+2%) · $0.051 (−13%) · 6/6 |
| `read-only` / sol | 55 s · 176k tok · $0.118 · 6/6 | 63 s (+14%) · 345k tok (+96%) · $0.151 · 6/6 | 56 s (+2%) · 225k tok (+28%) · $0.125 · 6/6 |
| `slow-redis` / luna | 207 s · 691k tok · $0.021 · **1/8** | 161 s (−22%) · 1.09M tok (+57%) · $0.025 · **0/6** | **123 s (−41%) · 517k tok (−25%) · $0.015 (−29%) · 5/6** |
| `slow-redis` / terra | 196 s · 461k tok · $0.109 · 3/3 | 159 s (−19%) · 573k tok (+24%) · $0.119 · 3/3 | **63 s (−68%) · 212k tok (−54%) · $0.057 (−48%)** · 3/3 |
| `slow-redis` / sol | 119 s · 337k tok · $0.159 · 3/3 | 158 s (+32%) · 689k tok (+105%) · $0.232 · 3/3 | **66 s (−45%) · 213k tok (−37%) · $0.113 (−29%)** · 3/3 |

What is and is not established:

| Comparison | Result |
|---|---|
| Shipped skills + MCP vs raw, `slow-sql` / `read-only` | Worse on time, tokens and cost in all six cells. Tokens and cost p ≤ 0.004 in all six; time p ≤ 0.004 in five, sol `read-only` +14% (p = 0.31). |
| Proposed vs shipped skills + MCP | Better on time, tokens and cost in all nine cells. p ≤ 0.004 wherever both arms have six trials (luna and terra `slow-sql` / `read-only`, sol `slow-sql`, luna `slow-redis`); sol `read-only` −11% / −35% / −17% (p = 0.49 / 0.09 / 0.07); terra and sol `slow-redis` −60% / −58% time at 3 vs 3 (p = 0.10). |
| Proposed vs raw, `slow-sql` / `read-only` | Time: −3% to +16%, no cell significant (p ≥ 0.13). Tokens: luna `slow-sql` −26% (p = 0.14); terra `slow-sql` +24% (p = 0.04), sol `slow-sql` +23% (p = 0.009), sol `read-only` +28% (p = 0.07). Cost: luna `slow-sql` −22% (p = 0.05), otherwise within ±13%. |
| Proposed vs raw, `slow-redis` | luna: 5/6 against 1/8 root cause removed; −41% time (p = 0.005), −25% tokens (p = 0.14), −29% cost (p = 0.10). terra: −68% / −54% / −48%; sol: −45% / −37% / −29%; 3 vs 3, p = 0.10 to 0.40. |

### Success rate

`slow-sql` and `read-only`: every graded trial passed except on luna, `read-only`, where
the arms with the shipped MCP server patched the **application** to force its own
sessions read-write instead of resetting the database (`aspire-mcp` 1/3, `aspire-skills-mcp`
2/6; `raw` 9/9, `aspire-lean` 12/12, `aspire-skills` 3/3), and one raw luna `slow-sql`
trial (8/9).

`slow-redis` on luna separates the arms completely. Of each arm's trials:

| Arm (luna) | Saw the exporter | Looked at the cache (`SLOWLOG` / `CLIENT LIST`) | Patched the application | Root cause removed |
|---|---:|---:|---:|---:|
| `raw` | 5/8 | 3/8 | 7/8 | **1/8** |
| `aspire-cli` | 2/6 | 2/6 | 6/6 | **0/6** |
| `aspire-skills-mcp` | 0/6 | 0/6 | 6/6 | **0/6** |
| `aspire-lean` | 6/6 | 6/6 | 1/6 | **5/6** |
| `aspire-lean-mcp-all` | 4/6 | 4/6 | 4/6 | 3/6 |

Every failing agent did the same thing: it read `BingoService`, parallelised or cached
the per-square reads, rebuilt and restarted the admin, and declared the request faster.
The exporter kept blocking the cache, so the verifier's eight status calls still took
0.5 to 10 s. The raw agents that did find the exporter (`ps` shows it) mostly also
patched the application, then killed or restarted the wrong process; the one raw pass
rewrote the exporter to use `SCAN` and took the full 900 s budget. On terra and sol
every arm found the exporter within the first minute (`ps` on the raw app, `SLOWLOG`
on the aspirified one) and most rewrote it rather than only stopping it.

## Where the time goes

Median seconds from the agent's first event (luna, `slow-sql`):

| Arm | Root cause on screen | First repair command | Done |
|---|---:|---:|---:|
| `raw` | 19 | 41 | 84 |
| `raw-check` (rounds 1–5) | 25 | 65 | 132 |
| `aspire-cli` (no skills) | 77 | 128 | 191 |
| `aspire-skills` | 58 | 95 | 178 |
| `aspire-skills-mcp` | 105 | 161 | 262 |
| `aspire-lean` | 26 | 50 | 87 |

With the new skill the Aspire agent finds the cause about as fast as the raw-app agent
reads it from `admin.log`, and finishes in the same time. Without a skill, an Aspire
agent takes three to four times as long to find the cause: it has more surfaces to
explore and no recipe.

`slow-redis`, where the log is silent:

| Model | Arm | Root cause on screen | First repair command | Done |
|---|---|---:|---:|---:|
| luna | `raw` | 42 (5 of 8 ever) | 158 | 207 |
| luna | `aspire-skills-mcp` | never (0 of 6) | - | 161 |
| luna | `aspire-lean` | 38 (6 of 6) | 63 | 123 |
| terra | `raw` | 3 | 100 | 196 |
| terra | `aspire-skills-mcp` | 4 | 108 | 159 |
| terra | `aspire-lean` | 17 | 33 | 63 |
| sol | `raw` | 19 | 74 | 119 |
| sol | `aspire-skills-mcp` | 36 | 83 | 158 |
| sol | `aspire-lean` | 12 | 26 | 66 |

"Root cause on screen" is the first tool result that mentions the exporter; on terra the
raw agent's first `ps` already lists it, but the agent then spends 100 s reading source
before acting on it. The lean agent sees it later (through `aspire describe cache` and
`SLOWLOG`) and acts within 15 to 25 s, because the skill tells it what a slow cache
command from one client means.

Mean tool output read per trial (luna, `slow-sql`, round 1, 3 trials per arm), by source:

| Arm | Source files | Aspire CLI | Aspire MCP | Log files | Database |
|---|---:|---:|---:|---:|---:|
| `raw-check` | 116 KB | - | - | 45 KB | 14 KB |
| `aspire-skills-mcp` | 217 KB | - | 305 KB | - | 7 KB |
| `aspire-lean` | 36 KB | 75 KB | - | - | 9 KB |

Telemetry replaces two thirds of the source reading. But 57 KB of the 75 KB that the
lean agent reads from the Aspire CLI is two table commands (`aspire describe` and the
trace list) whose box-drawing borders and per-row dashboard URLs carry no information
for an agent. That is the motivation for the CLI patch below.

## Skills ablation (same aspirified app)

Luna, medians, 3 to 9 trials:

| Arm | `slow-sql` | `read-only` | Skill actually loaded |
|---|---|---|---|
| `aspire-cli` (none) | 191 s · 910k tok | 171 s · 803k tok | - |
| `aspire-skills` (shipped) | 178 s · 759k tok | 207 s · 1.22M tok | none in 4 of 6 trials |
| `aspire-plus` (shipped + `aspire-diagnose`) | 133 s · 390k tok | 167 s · 799k tok | `aspire-diagnose` in 4 of 6 |
| `aspire-lean` (proposed) | 87 s · 255k tok | 89 s · 335k tok | `aspire-diagnose` in 21 of 21 |

On luna the shipped skills are no better than no skills, because luna mostly does not
load them. Adding the new skill next to the router helps only when it wins selection.
Removing the router makes selection reliable: `aspire-diagnose` was loaded in 57 of 57
`aspire-lean` diagnosis trials and in 162 of 162 across every `lean`-based arm. On terra
the shipped skills load `aspire-monitoring` every time and are still 27% to 31% slower
than `aspire-lean`. Details and the design rules that follow are in
[SKILLS-PROPOSAL.md](SKILLS-PROPOSAL.md).

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

**All product changes together.** `aspire-lean-mcp-all` (lean skills, MCP, both
patches) against `aspire-lean-mcp-src` (lean skills, MCP, unpatched source build):

| Scenario / model | Agent time | Input tokens | MCP calls → CLI calls (median) |
|---|---|---|---|
| `slow-sql` / luna | 140 s → 95 s (−32%) | 453k → 287k (−37%) | 3 → 1 MCP, 7 → 7 CLI |
| `slow-sql` / terra | 70 s → 62 s (−12%) | 226k → 219k (−3%) | 2 → 5 MCP, 4 → 1 CLI |
| `read-only` / luna | 123 s → 89 s (−28%) | 563k → 487k (−14%) | 10 → 10 MCP, 6 → 1 CLI |
| `read-only` / terra | 61 s → 48 s (−22%, p = 0.06) | 341k → 291k (−15%) | 3 → 8.5 MCP, 7 → 1 CLI |

Faster in all four cells, and with compact telemetry the agent makes MCP its main route.
On `slow-redis` that route is a liability for the cheapest model: with MCP available,
luna called `list_traces` / `list_structured_logs` 10 to 18 times, read source and
patched the application in 2 of 6 trials without ever opening the cache; 3 of 6 passed
against 5 of 6 for the CLI-only lean set (166 s against 123 s). On terra and sol the
arm passed 6 of 6 (99 s and 47 s against raw's 196 s and 119 s).

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

## Cold start

Scenario `cold-start`: nothing is running; the agent must bring the app up. Arms:
`raw`, `aspire-cli`, `aspire-skills`, `aspire-lean`, and `aspire-lean-start` (adds the
new [`aspire-start`](common/skills/start/aspire-start/SKILL.md) skill). Both local
reference starts pass the verifier (raw 8 s, Aspire 14 s with warm caches). Medians
over 3 trials per cell (`raw` is the round-7 re-run; the round-4b raw cells were within
3 s of it); all 54 trials passed.

| Model | `raw` | `aspire-cli` | `aspire-skills` | `aspire-lean` | `aspire-lean-start` |
|---|---|---|---|---|---|
| luna | 43 s · 77k tok | 49 s (+15%) · 72k | 52 s (+22%) · 126k | **82 s (+94%) · 249k** | 51 s (+19%) · 116k |
| terra | 36 s · 63k tok | 51 s (+42%) · 75k | 53 s (+45%) · 83k | 51 s (+41%) · 122k | 54 s (+50%) · 116k |
| sol | 36 s · 47k tok | 50 s (+39%) · 70k | 50 s (+42%) · 121k | 56 s (+56%) · 120k | 54 s (+51%) · 114k |

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
  (195 luna, 155 terra, 111 sol). Copilot CLI `1.0.99-0` in all 461.
- Six luna trials in round 5 ended in a runner exception before grading (five
  `X_403_MODEL_CALL_FAILURE` from the model service, one agent-package download reset).
  They are in `trials.jsonl` with `infrastructure_failure: true` and in no other number.
- Rounds 3 and 4 (111 runs) were accepted by the cloud scheduler but had not started
  after two hours. All of them were cancelled; two had already produced a trial and
  those are included. The same cells were resubmitted unchanged as rounds `r3b` and
  `r4b`. Rounds 6 and 7 waited 35 minutes at the head of the same queue and then ran.
  Cancelled entries stay in `ledger.jsonl` with `cancelled: true` and are never fetched.
- The `raw` arm changed between round 5 and round 7 (the check script was removed, see
  Baseline). Trials of the old configuration are labelled `raw-check` by
  `tools/collect.py` and never pooled with `raw`.
- One trial, raw / luna / `slow-redis` (failed), read `/opt/benchmark/traffic.mjs`,
  `endpoints.json` and `state.json` after `ps` showed the traffic generator; `state.json`
  names the fault. It is the only trial in 467 that referenced a harness path
  (`harness_paths_read` in `trials.jsonl`); it is kept and did not benefit. No trial
  read the verifier, the reference repair or the tests.
- Before any model ran, each fault was validated on both app kinds: the verifier fails
  on the broken state and passes after the reference repair, locally and in the cloud.
  All eleven remote no-model gates completed with reward 1 (`slow-sql` and `read-only`
  on raw, `aspire-lean-mcp`, `aspire-skills-mcp`, `aspire-mcp-src`,
  `aspire-lean-mcp-compact`, `aspire-lean-plain`; `cold-start` on raw and
  `aspire-lean-start`; `slow-redis` on raw and `aspire-lean`).
- No graded trial was discarded. `aspire-lean-mcp` / `slow-sql` / luna has 4 trials
  because the pipeline probe ran the identical cell and is included. Two round-6 raw
  luna `slow-redis` runs were downloaded partially at first and re-fetched; both are
  graded failures.
- Runner-reported model cost for the 461 graded trials: USD 26.34.

## Limits

- One application and three faults. Two of them (database-side) leave a signal in the
  raw app's own log file, which is why the raw baseline is at parity there; the third
  (a cache blocked by a host-side client) leaves none and is where telemetry wins. A
  fault that spans services, or one inside application code, is still not covered.
- `slow-redis` has 3 trials per arm on terra and sol (smallest attainable p = 0.10) and
  6 to 8 on luna. Its root cause is outside the application, which favours agents that
  look at the dependency over agents that read code; the shipped skills steer towards
  the latter.
- The aspirified app has PostgreSQL client tracing; the raw app has no tracing. The
  product comparison therefore combines instrumentation with tooling. Neither app has
  Redis client tracing, so on `slow-redis` the trace shows the slow request and a short
  database span: the cache is implicated by elimination, not named.
- The source-built CLI arms are managed builds, not NativeAOT like the daily. They are
  only ever compared with each other.
- The patch arms, the all-changes arm and every cold-start cell have 3 trials per arm,
  where the smallest attainable p is 0.10. Those sections report direction and
  magnitude, not significance.
- The `read-only` verifier separates "root cause removed" from "application works"
  from round 2 on. Round-1 failures were classified from their failure text.
- Fresh single-turn conversations only. One agent harness (Copilot CLI).

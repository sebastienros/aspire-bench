# Plan: improving agentic performance with Aspire (CLI, MCP, skills)

Status: proposal, 2026-11-17. **Phase 2 closed 2026-11-19: twelve cards with verdicts, $31.09 against ≈ $20.50 (REPORT §14, Phase 2 scorecard). Phase 3 started 2026-11-19 (three lanes: orchestration T3.1; authoring T3.2, T3.3; ops T3.4, T3.5, T3.7; rulings in §7 "Phase 3 rulings"; T3.6 recorded from T3.9).** T0.1 (re-pin and re-baseline), T0.2 (held-out application; ship gate open on the reserved third fault after one skill revision), T0.3 (series tooling) and T0.4 (harness adapters) done 2026-11-18. Phase 1 model lane closed 2026-11-18: T1.1 ship, T1.6 drop (`aspire-start`), T1.7 no verdict (Claude Code harness gaps; adapter proposed as T4.7), T1.8 revise (step-4 edit proposed). Product lane: T1.5 ship (CLI plain output), T1.4 drop (compact MCP telemetry; terra gain recorded), T1.9 harness-dependent (VS Code; T4.8, T4.9 proposed), T2.10 drop (`AGENTS.md`; it fixes command selection, not luna's time), T2.11 ship (file v2 replaces `aspire-orchestration` for the start job). Skills lane: T3.8 remove (the router's guardrail job; ceiling on every arm), T1.2 drop (narrowed trigger alone), T1.3 ship (router removal; its cost holds across rounds on `read-only`, not on `slow-sql`; cold start open), T3.9 selection benchmark usable on terra, not on luna (it over-predicts the router). Phase 2 CLI lane: T2.2 drop (a blocking start closes none of the cold-start gap; the gap is the AppHost's launch and resource start-up), T2.9 the start itself is the gap, for MCP registered only (the MCP route was not taken), T2.3 revise by the rule with no revision proposed (agents left JSON, nothing improved), T2.4 drop (guard). Phase 2 MCP lane: T2.1 drop (compact `list_resources`/`list_console_logs`; revise on one cell under the later MCP-only metric ruling, guard fails under both), T2.7 no verdict between the bars (the seven unused tools are 1.8–2.2 % of input; no change for tokens), T2.8 no variant ships (lean + MCP already passes, premise not reproduced; on the shipped set + MCP the variants reach the cache but not the cause, so "CLI-only lean for cheap models on silent faults" stands). Integrations lane: T4.1 audit done (15 integrations; generic client recipe 6/15, so T2.6 took the `connect` block), T2.5 revise (traced app: lean on the CLI reaches the cache 22 vs 38 s, both rounds; the MCP pass gap did not replicate; span-table row not worth proposing), T2.6 ship (`connect` object in `describe --format Json`; generic step 3 matches the hand-written step, luna n = 6). No issue has been filed.
Each task below is a card with the same fields; a card's **Results** field is either a
link to measured numbers or `pending`. Nothing in a Results field is predicted.

Built on [REPORT.md](REPORT.md) (what was measured on the 2026-11-09 pins),
[FINDINGS.md](../FINDINGS.md) F01 to F24, and the issue drafts in
[upstream-issues/](../upstream-issues/). REPORT §11 (tracking) and §12 (next
investigations) rank the follow-ups; this plan turns that ranking into tasks with
benchmarks attached and does not replace it.

Contents

1. [Decisions assumed](#1-decisions-assumed)
2. [What changed upstream since the last measurement](#2-what-changed-upstream-since-the-last-measurement)
3. [How every task is measured](#3-how-every-task-is-measured)
4. [Phase 0: re-baseline and gates](#4-phase-0-re-baseline-and-gates)
5. [Phase 1: confirm what is already measured](#5-phase-1-confirm-what-is-already-measured)
6. [Phase 2: product changes not yet built](#6-phase-2-product-changes-not-yet-built)
7. [Phase 3: bottom-up audit of the shipped skills](#7-phase-3-bottom-up-audit-of-the-shipped-skills)
8. [Phase 4: new scenarios and infrastructure](#8-phase-4-new-scenarios-and-infrastructure)
9. [Sequencing, budget and reporting](#9-sequencing-budget-and-reporting)

---

## 1. Decisions assumed

These are the user's calls. The plan proceeds on the defaults in the second column.

| Decision | Default assumed here | Why it matters |
|---|---|---|
| Model budget per phase | Phase 0 ≈ $14, Phase 1 ≈ $42 at the cards' estimates, re-estimated to ≈ $60 after the model lane (T1.1, T1.6, T1.7, T1.8) cost $45.91 against $27.50 (sol $0.287 and Opus $0.370 per trial on Bingo measured, not $0.118 and $0.25; sol cold start $0.15, so the sol cold-start cells of T2.2 and T2.9 keep their estimates), Phase 2 ≈ $20.50 (T2.10 and T2.11 added 2026-11-18; actual $31.09 at close, 2026-11-19), Phase 3 ≈ $26, Phase 4 ≈ $5 plus ≈ $5 per tracking run (model cost only, summed from the cards' estimates at this dataset's per-trial means; Opus assumed at $0.25 per trial before T1.8 measured $0.370) | Sets n per cell and how many scenarios the skill audit gets |
| Models | `gpt-6-luna` and `gpt-6.1-terra` in every decision cell; **`gpt-6.2-sol` replaces `gpt-6.1-sol`** and **`claude-opus-5.5` is added**; both run on ship gates and on their own lane (T1.8), not in every cell | Luna is where guidance decides the outcome. Catalogue prices per 1M input tokens: luna 10, terra 100, sol 200 (6.1 and 6.2 alike), Opus 5.5 400; Opus 4.8 and 5 are marked for deprecation, so 5.5 is the Opus to use. A one-trial probe of each on `cold-start`/`raw` (round `probe-models`) passed on 2026-11-17 under the pinned Copilot CLI; numbers in T1.8 |
| Skills baseline | `microsoft/aspire-skills` **v0.0.6** (released 2026-11-17) | v0.0.5 is no longer what `aspire agent init` registers |
| Held-out application | A second Bingo-sized app with a different stack (minimal API + SQL Server + RabbitMQ worker), built in this repo; eShop only if that proves too small | Every "ship" verdict on `aspire-diagnose` is gated on it |
| Second agent harness | **VS Code agent mode** (`vscode` special agent) gets its own lane (T1.9); the `vscode-copilot-cli`, `vscode-ahp` and `vscode-claude` variants are not used; Claude Code stays as one cell set (T1.7) | VS Code is where most users meet the skills and the MCP server. The Copilot CLI engine is already the measured harness, so a VS Code variant that hosts it would overlap with those rows rather than add a surface |
| Filing upstream issues | Not before Phase 1 confirms (user: "Not now") | Drafts stay in `upstream-issues/` with `status: draft` |

---

## 2. What changed upstream since the last measurement

Checked 2026-11-17 against the 2026-11-09 pins (`4954c76a`, skills `1117facb` = v0.0.5).

| Where | Change | Effect on this plan |
|---|---|---|
| `aspire-skills` v0.0.6 | Router, `aspire-orchestration`, `aspireify`, `aspire-init`, `aspire-deployment` bodies changed; `aspire-monitoring` body tweaked (wait before describe, jq path), **trigger description unchanged**; router still routes "something's wrong" to `aspire-monitoring`; the compare also touched `evals/eval.yaml` under `aspire`, `aspireify` (plus a new `evals/safety`), `aspire-init`, `aspire-monitoring` and `aspire-orchestration`, so those evals predate v0.0.6 (vally, prompt-only, LLM-judged rubric, `gpt-5.6-sol`, 3 runs); the diff showed none for deployment, terminals or v2-migration. The repository also has a top-level `evals/` tree (`csharp-apphost`, `ts-apphost`, `go-apphost`, `non-aspire`, `terminals`, `project-v2-migration`, `service-defaults-template`, `version-preservation`) and a `grade-routing-entry.mjs` routing grader | The shipped-set arm must be rebuilt from v0.0.6. The proposals (`aspire-diagnose`, router removal, monitoring trigger) are still open. The upstream evals judge advice text, not live outcomes, and the routing grader is the closest thing to T3.9; Phase 3 complements them rather than duplicating them, and T3.9 should reuse that grader's prompt set where it fits |
| `microsoft/aspire` main, 107 commits | **Persisted stable AppHost ports** (#21013): generated public ports stored under `.aspire/state`; **isolated mode skips persistence by default** (`portAllocation.persistInIsolatedMode` opts in) | The aspirified README tells the agent to start with `--isolated`, so the measured cold start still gets fresh ports. A first start is unchanged in any case. T0.1 adds a warm-start cell without `--isolated` to see whether a known port removes the `describe` step |
| | `aspire agent init` registers the plugin and offers to **remove static skill copies** (#22080); telemetry hooks installed for Aspire-configured agents (#22078, #22093) | How skills reach the agent changed, not their content. The benchmark's copy into `.github/skills` stays representative of content; the arm table must say so |
| | `aspire describe` table shows exit codes (#22054) | Output shape changed; the plain-output patch needs a rebase and the byte counts a re-measure |
| | Redis `WithArgs` forwarded in publish mode (#21447); no change to the TLS-on-6379 default | F22 stands |
| MSBench catalogue (checked 2026-11-17) | Models through CAPI include `gpt-6.2-sol`, `gpt-6.2-astra`, `claude-opus-5.5`, `claude-sonnet-5.5`, `claude-haiku-5.5`; `claude-opus-4.8` and `claude-opus-5` carry a deprecation notice. Special agents available: `github-copilot-cli` (used so far), `claude-code`, `codex-cli`, `cursor-cli`, `gemini-cli`, `opencode`, `openhands`, and four VS Code variants: `vscode` (VS Code agent mode via `@vscode/vscode-copilot-evaluation-agent`; the one this plan uses), `vscode-copilot-cli` (session target `copilotcli`), `vscode-ahp` (`agent-host-copilotcli`), `vscode-claude` (Claude agent host); the last three host another engine inside VS Code and are not used. The VS Code plugin takes `--model` as a `modelSelector` and accepts a `user-overrides.yaml` through `--agent_assets` for settings such as `chat.tools.global.autoApprove` | Opus and GPT-6.2 Sol can be added without new tooling; the VS Code lane needs adapters (T0.4) |
| MCP server | 15 tools: `list_apphosts`, `select_apphost`, `list_resources`, `list_traces`, `list_trace_structured_logs`, `list_structured_logs`, `list_console_logs`, `execute_resource_command`, `wait_for_resources`, `doctor`, `get_doc`, `list_docs`, `search_docs`, `list_integrations`, `refresh_tools`; schema 9.5 KB | Measured use over 152 MCP-arm trials: `list_traces` 386 calls, `list_resources` 252, `list_structured_logs` 205, `list_console_logs` 135, `list_apphosts` 88, `execute_resource_command` 68, `wait_for_resources` 65, `list_trace_structured_logs` 58, `select_apphost` 3, `get_doc` 1, the other five **never**. Bottom-up candidates in Task 2.7 |

---

## 3. How every task is measured

The rules below apply to every card. A card only repeats them where it deviates.

**Arms.** `raw` runs in every cell as the control that absorbs model, runner and
infrastructure drift; Aspire arms are reported as ratios to `raw` in the same round.
Skill changes run on the official daily CLI. Product patches run on a source build and
are compared only with the unpatched `*-src` control built the same way.

**Cells.** Scenario × model × arm with **n ≥ 6 wherever a verdict is taken** and luna
always included. Three-trial cells are allowed only for direction-finding and are
labelled so. Exact Mann-Whitney as in `tools/stats.py`; the floor at 6 vs 6 is p = 0.002.

**Guard cells.** Every change that touches the route an agent takes (a skill, an MCP tool
shape, a CLI output) also runs luna on `slow-redis` and `slow-sql`. The MCP compaction
already showed why: it moved agents onto a route that wins on `slow-sql` and loses on
`slow-redis` (3 of 6 against 5 of 6).

**Metrics.** Pass rate (verifier only), agent seconds, input tokens, cost, seconds to root
cause and to first fix, skill selected, references read, MCP calls, characters read,
harness-path leaks (must be 0).

**Decision rule, written before the run.** Each card states what "ship", "revise" and
"drop" look like in numbers. A result that misses the rule is recorded, not re-run until
it passes.

**Cost.** From this dataset: $0.016 (luna), $0.065 (terra), $0.118 (sol 6.1) per trial;
measured by T1.8 (2026-11-18, round `t18`, Bingo): **`gpt-6.2-sol` $0.287** per trial (2.4× the
6.1-sol figure assumed before) and **`claude-opus-5.5` $0.370** (1.5× the $0.25 assumed), with `slow-redis`
the dearest scenario ($0.40 and $0.48). On the held-out app sol and Opus cost $0.35 and $0.37 (T1.1), and terra
$0.095 to $0.170 (T0.2). A "decision cell" of 6 trials costs about $0.10 on luna, $0.39 on terra
(about twice that on the held-out app), $1.70 on sol and $2.20 on Opus. Wall time is
dominated by the CES queue, 1 to 2 hours per round.

**Record.** Every run lands in `results/ledger.jsonl` with a `task` field naming the card
(for example `T1.4`), so `collect.py` and the series tooling (Task 0.3) can slice by task.
A card's Results field links to the `comparison.md` cells and `stats.md` rows it produced.

---

## 4. Phase 0: re-baseline and gates

Nothing in later phases is interpretable until these three are done.

### T0.1 Re-pin and re-baseline

| | |
|---|---|
| Hypothesis | The 2026-11-09 numbers still describe current main and v0.0.6; if not, the deltas below change |
| Change | Pin the current daily and skills v0.0.6; rebuild `current` under `common/skills`; regenerate `lean` from it (same three edits); rebase patch 0002 on the describe exit-code change; re-pin the three-commit task graph |
| Arms | `raw`, `aspire-cli`, `aspire-skills-mcp` (v0.0.6), `aspire-lean` (v0.0.6 base) |
| Cells | `slow-sql`, `read-only`, `slow-redis`, `cold-start` × luna, terra × n = 6; plus a **sol bridge**: `slow-sql` × `raw`, `aspire-lean` × `gpt-6.1-sol` and `gpt-6.2-sol` × 3, so the series can splice 6.1 to 6.2 |
| Decision rule | None; this is the new baseline. Report every cell as a ratio to raw next to the 11-09 ratio. A cell that moved more than 25% gets a one-line cause from the trajectories |
| Also answer | Did #21013 change `cold-start`? A first start on a fresh clone cannot differ; measure a **warm** cold start (second `aspire start` in the same workspace, **without** `--isolated`, or with `persistInIsolatedMode`) as an extra 3-trial cell on luna. Did #22054 change `describe` bytes (no model)? Does **plugin delivery** change selection (F04): one 3-trial luna `slow-sql` cell where the image registers the plugin through `aspire agent init` instead of copying into `.github/skills`; selection must match the copy within one trial, otherwise the arm definition changes |
| Trials / cost | 4 scenarios × 4 arms × 2 models × 6 = 192 trials + 6 extra + 12 sol bridge ≈ $9.30 |
| Results | Done 2026-11-18: [T0.1 results](#t01-results) below. New pin `2026-11-17`; all gates reward 1 after one fixture fix; baseline round `t01b` (213 trials) after the first round was lost to a model-service incident |

#### T0.1 results

**Pins (pin `2026-11-17`).** Aspire daily `17.1.0-preview.1.26567.3+30326eb876d6897b1feadc8bc800f78e466b1b52`
(104 commits after `4954c76a`, built 2026-11-17, three commits behind `main` `27c59c34`; source
builds use SDK `11.0.100`), CLI archives SHA-256 x64 `f2c40e69…3701a`, arm64 `18b9cd4b…de4a5`;
AppHost SDK and Hosting packages `17.1.0-preview.1.26567.3`; `microsoft/aspire-skills` **v0.0.6**
(`e529b608`, from `skills/`, the plugin manifest's path; `.github/plugins/aspire-skills/skills/` is
per-file symlinks into it); lean monitoring override re-derived on the v0.0.6 body. Suite commit
`ed19b038` (tasks `916a57ce`), then `db64b1ba` (tasks `0dfaf98f`) after the warm-start fix below;
every `t01b*` trial ran on tasks `0dfaf98f`. Copilot CLI `1.0.99-0` as before.

**Gates (no model), all reward 1.** `gate-t01` (first submission sat `queued_in_ces` 57 min, was
cancelled and resubmitted): `raw` and `aspire-lean` × four scenarios `2026111810121500`,
`…124524`, `…127098`, `…129454`, `…131792`, `…134110`, `…136418`, `…138696`; `aspire-cli`
`…141394` and `aspire-skills-mcp` `…143888` on `slow-sql`; plus the new cells
`cold-start/aspire-skills-mcp` `…146698` and `slow-sql/aspire-skills-plugin` `…151862`.
`cold-start-warm/aspire-lean` failed (`…149462`, reward 0) on a fixture race: `aspire stop`
returns before DCP removes the containers, so the next start collided on `bingo-redis`
([FINDINGS F25](../FINDINGS.md#f25-aspire-stop-returns-before-its-containers-are-gone-so-an-immediate-restart-collides-on-fixed-container-names)).
Setup now waits for the containers to go; re-gated as `gate-t01-warm` `2026111812956718`, reward 1.
Local gates (fail → repair → pass) passed for `aspire-lean`/`slow-sql`, `raw`/`slow-sql` and the warm cell.
The source-build arms, regenerated at the new pin, were gated afterwards as `gate-t01-src` (2026-11-18,
same tasks `0dfaf98f`): all 15 reward 1, no fixture change. `slow-sql` and `read-only` × `aspire-mcp-src`,
`aspire-mcp-compact`, `aspire-lean-mcp-src`, `aspire-lean-mcp-compact`, `aspire-lean-src`, `aspire-lean-plain`,
`aspire-lean-mcp-all` (`2026111827594664`, `…596990`, `…599266`, `…601560`, `…603710`, `…605860`,
`…608018`; `…610200`, `…612544`, `…615234`, `…617692`, `…619966`, `…622260`, `…624514`) and
`slow-redis/aspire-lean-mcp-all` `…626776`. The image runs `git apply` on the patch before publishing the
CLI, so a graded trial means patches 0001, 0002 and `agentic-all` applied to `30326eb8` and built; the
image's `aspire --version` is not in the run artifacts.

**Model-service incident; the first round is excluded.** Rounds `t01`, `t01-solbridge`, `t01-plugin`,
`t01-warm` ran 2026-11-18 03:30–04:52 UTC while model calls hung 240 s and returned 504/503: 76
trials timed out at 900 s and 12 crashed, and 52 of 93 completed luna trials lost over 60 s to
failed calls (1 of 461 trials on the 11-09 pin). They stay in `trials.jsonl` with an `excluded`
reason, as does `t01-topup` (9 terra replacements); everything was re-run as `t01b*` after a probe.
In `t01b*` no trial timed out, one crashed (luna `read-only`/`raw`, so that cell has n = 5), and
the median time lost to 5xx (failed call plus retry backoff, `model_service_wait_seconds`) was
1.5 s (terra) to 2.7 s (luna), 2–3 % of agent time; max 26 s. See
[FINDINGS F06](../FINDINGS.md#f06-setup-failures-must-not-become-model-or-aspire-failures).

**Ratios to `raw`, same pin, scenario and model** (medians; time = agent seconds, tokens = input
tokens; pass = verifier, arm / raw). 11-17 = round `t01b`, n = 6 per cell unless shown; 11-09 =
every round of the first pin pooled, as in [comparison.md](results/comparison.md) (its `aspire-cli`
cells, terra `slow-redis` and all `cold-start` cells are n = 3). Significance per cell:
[stats.md, pin 2026-11-17](results/stats.md).

| Scenario | Model | Arm | 11-17 time | 11-17 tokens | 11-17 pass (arm / raw) | 11-09 time | 11-09 tokens | 11-09 pass (arm / raw) |
|---|---|---|---:|---:|---|---:|---:|---|
| slow-sql | luna | aspire-cli | 1.97× | 2.76× | 6/6 / 6/6 | 2.26× | 2.66× | 3/3 / 8/9 |
| slow-sql | luna | aspire-skills-mcp | 2.24× | 3.30× | 6/6 / 6/6 | 3.10× | 4.36× | 6/6 / 8/9 |
| slow-sql | luna | aspire-lean | 1.39× | 1.21× | 6/6 / 6/6 | 1.03× | 0.74× | 9/9 / 8/9 |
| slow-sql | terra | aspire-cli | 1.22× | 1.76× | 6/6 / 6/6 | 1.40× | 1.68× | 3/3 / 6/6 |
| slow-sql | terra | aspire-skills-mcp | 1.33× | 2.31× | 6/6 / 6/6 | 1.65× | 3.21× | 6/6 / 6/6 |
| slow-sql | terra | aspire-lean | 1.04× | 1.06× | 6/6 / 6/6 | 1.16× | 1.24× | 6/6 / 6/6 |
| read-only | luna | aspire-cli | 1.17× | 1.45× | 4/6 / 5/5 | 2.21× | 2.41× | 3/3 / 9/9 |
| read-only | luna | aspire-skills-mcp | 1.71× | 2.72× | 4/6 / 5/5 | 3.28× | 4.56× | 2/6 / 9/9 |
| read-only | luna | aspire-lean | 0.80× | 0.82× | 6/6 / 5/5 | 1.15× | 1.01× | 12/12 / 9/9 |
| read-only | terra | aspire-cli | 1.36× | 1.88× | 6/6 / 6/6 | 1.21× | 1.64× | 3/3 / 6/6 |
| read-only | terra | aspire-skills-mcp | 1.41× | 2.60× | 6/6 / 6/6 | 1.42× | 2.27× | 6/6 / 6/6 |
| read-only | terra | aspire-lean | 0.94× | 1.15× | 6/6 / 6/6 | 1.02× | 1.02× | 6/6 / 6/6 |
| slow-redis | luna | aspire-cli | 0.39× | 0.50× | 0/6 / 1/6 | 0.94× | 0.96× | 0/6 / 1/8 |
| slow-redis | luna | aspire-skills-mcp | 0.39× | 0.63× | 0/6 / 1/6 | 0.78× | 1.57× | 0/6 / 1/8 |
| slow-redis | luna | aspire-lean | 0.41× | 0.53× | 4/6 / 1/6 | 0.59× | 0.75× | 5/6 / 1/8 |
| slow-redis | terra | aspire-cli | 1.03× | 1.57× | 6/6 / 6/6 | 0.60× | 0.93× | 3/3 / 3/3 |
| slow-redis | terra | aspire-skills-mcp | 1.00× | 1.73× | 6/6 / 6/6 | 0.81× | 1.24× | 3/3 / 3/3 |
| slow-redis | terra | aspire-lean | 0.34× | 0.54× | 6/6 / 6/6 | 0.32× | 0.46× | 3/3 / 3/3 |
| cold-start | luna | aspire-cli | 1.26× | 1.69× | 6/6 / 6/6 | 1.15× | 0.94× | 3/3 / 3/3 |
| cold-start | luna | aspire-skills-mcp | 1.36× | 2.61× | 6/6 / 6/6 | no cell | |  |
| cold-start | luna | aspire-lean | 1.51× | 2.64× | 6/6 / 6/6 | 1.94× | 3.23× | 3/3 / 3/3 |
| cold-start | terra | aspire-cli | 1.29× | 1.43× | 6/6 / 6/6 | 1.42× | 1.20× | 3/3 / 3/3 |
| cold-start | terra | aspire-skills-mcp | 1.20× | 2.44× | 6/6 / 6/6 | no cell | |  |
| cold-start | terra | aspire-lean | 1.35× | 2.46× | 6/6 / 6/6 | 1.41× | 1.95× | 3/3 / 3/3 |

**Cells that moved more than 25 points** (time or tokens ratio), cause read from the trajectories:

- `slow-sql`/luna/`aspire-cli` (time −0.29): noise; the three 11-09 trials (170–247 s) lie inside the new range (114–356 s) and phase times are similar.
- `slow-sql`/luna/`aspire-skills-mcp` (−0.86 / −1.06): same step order (skill, `list_resources`/`list_traces`/`list_structured_logs`, psql trigger query, `CREATE INDEX CONCURRENTLY`), but every phase is faster with fewer and faster model calls (16–25 vs 25–27 requests, 5.9–7.3 vs 8.7–9.6 s per request; raw's s/request is flat), and 3/6 new trials only hot-fixed the database where all 11-09 trials also wrote a migration or patch. No reaction to v0.0.6 text is visible; why the calls are faster is not determinable.
- `slow-sql`/luna/`aspire-lean` (+0.36 / +0.47): root cause (26 s) and first fix (57 → 59 s) are flat; time after the fix grew from 30 to 50 s because 3/6 new trials also wrote an EF migration (1/9 on 11-09), e.g. `2026111819651526` steps 17–29. Model variance; `aspire-diagnose` is unchanged.
- `slow-sql`/terra/`aspire-skills-mcp` (time −0.32, tokens −0.90; from per-trial metrics, no trajectory read): the raw denominator moved (raw 53 → 66 s, tokens +18 %, 173k → 205k) while the arm stayed flat (87 s both) and read 10 % less (417k → 376k chars); skills and MCP mix unchanged (monitoring 6/6).
- `read-only`/luna/`aspire-cli` (−1.04 / −0.96): mostly the raw denominator (below); arm 171 s (n = 3) → 131 s. Its two failures fixed the app, not the default: `…665844` set the option in the connection string, `…668390` repeated an execution-strategy patch also seen on 11-09 (`…029462`).
- `read-only`/luna/`aspire-skills-mcp` (−1.57 / −1.84, pass 2/6 → 4/6): raw denominator plus arm 254 → 193 s. All 6 new trials inspected PostgreSQL with `docker exec … psql` (1/6 on 11-09); 4 ran `ALTER DATABASE db RESET default_transaction_read_only` and then an MCP `restart` (e.g. `2026111819673276` steps 40–41); both failures fixed the app only. Skills loaded 3/6 (6/6 on 11-09), the skippers saying no skill matched; pass was not tied to loading (3/3 loaders, 1/3 skippers). Why fewer loaded is not determinable: descriptions differ only by `apphost.go`.
- `read-only`/luna/`aspire-lean` (time −0.35): raw denominator only; the arm is unchanged (89 → 90 s, same route).
- `read-only`/terra/`aspire-skills-mcp` (tokens +0.33; from per-trial metrics, no trajectory read): raw tokens −9 % (198k → 180k); arm skills and MCP mix unchanged.
- `slow-redis`/luna/`aspire-cli` (−0.55 / −0.45): raw denominator (raw 207 → 365 s); the arm itself is faster (195 → 141 s) with fewer ~30 s curl/redis-cli loops against the blocked cache (tool time 53 → 31 s). Its "root cause seen" 55 → 7 s is a marker artifact (a `ps` listing that shows `report-exporter.sh`, never acted on). 0/6 on both pins.
- `slow-redis`/luna/`aspire-skills-mcp` (−0.38 / −0.95): raw denominator; 4/6 new trials went straight to `list_apphosts` without the skill tool (skills 5/6 → 2/6); why is not determinable (frontmatter, MCP server code, prompt and install path unchanged). 0/6 on both pins.
- `slow-redis`/terra/`aspire-cli` (+0.43 / +0.64): the 11-09 cell is n = 3; diagnosis is identical (cause seen at tool 3, ~4 s); 4/6 new trials rewrote or repeatedly patched the exporter (e.g. `…880408`), 1/3 on 11-09. Within noise.
- `slow-redis`/terra/`aspire-skills-mcp` (tokens +0.49; from per-trial metrics, no trajectory read): raw tokens −16 % (461k → 386k, n = 3 on 11-09); arm skills and MCP mix unchanged.
- `cold-start`/luna/`aspire-cli` (tokens +0.75): both moved: raw −25 % (77k → 58k, n = 3), arm +36 % (72k → 98k) while what it read barely changed; per-call prompt size is bimodal and 3/6 new trials sit in the high mode (1/3 on 11-09); mechanism not determinable.
- `cold-start`/luna/`aspire-lean` (−0.43 / −0.59): the start sequence is unchanged (README's `aspire start … --isolated` then two waits; `2026111819738740` and `2026110977814172`, step 8 both). Fewer tools because a 28 KB `describe --format Json` spill-and-grep loop hit 2/3 trials on 11-09 and 2/6 now (recovered in one turn with per-resource `describe`). Bytes read rose (cheapest path 48k → 58k) from the v0.0.6 orchestration references (`detection.md` 13.4k → 18.0k, `app-commands.md` 16.2k → 19.1k) and the wider describe table. Whether the pin changed time is not determinable.
- `cold-start`/terra/`aspire-lean` (tokens +0.51): raw denominator (63k → 50k; 5/6 raw trials went straight to `scripts/start.sh`); the arm is flat (122k → 124k).

The two raw cells that moved on their own: luna `read-only` (77 → 112 s, n = 5) took the same
route with more output (6.1k → 8.6k tokens) between seeing the cause and fixing it (37 → 63 s);
5xx wait explains 4.6 s; other raw cells did not move, so most likely variance. Luna
`slow-redis` (207 → 365 s) shifted route: 5/6 trials probed the blocked cache 4–12 times before
patching (0–2 times in 6/8 on 11-09), each probe blocking 30–60 s (e.g. `2026111819689216`, no
5xx, steps 29–46); whether that is chance is not determinable (Fisher p ≈ 0.05). Caveat for every
"first fix" figure: the marker in `collect.py` also fires on a search for the SQL text or on a
process restart, so it is not used above where it misleads; fixing it would change the 11-09
tables and is left as a follow-up.

**Sol bridge** (`slow-sql`, n = 3 per cell, all passed; 11-09 6.1 cells n = 6):

| Model | Pin | raw s / tokens | aspire-lean s / tokens | lean ÷ raw time / tokens |
|---|---|---|---|---|
| gpt-6.1-sol | 11-09 | 53 / 155k | 60 / 191k | 1.13× / 1.23× |
| gpt-6.1-sol | 11-17 | 63 / 160k | 61 / 193k | 0.98× / 1.21× |
| gpt-6.2-sol | 11-17 | 52 / 125k | 58 / 230k | 1.11× / 1.83× |

6.2 reads less on raw and more on lean (describe 5.3 calls per trial vs 3.0 on 6.1), and costs more
per trial ($0.15 raw, $0.25 lean vs $0.10–0.11 on 6.1). Three trials per cell: direction only.

**Warm start (`t01b-warm`, 3 luna trials, `cold-start-warm/aspire-lean`).** Setup starts and stops
the AppHost once with `portAllocation.persistInIsolatedMode` (set by `aspire config set`; it lives
in `aspire.config.json`, not `.aspire/settings.json`); the second `--isolated` start reuses the
ports in `.aspire/state` (checked locally). All 3 passed in 64 s median against 63 s for the cold
`aspire-lean` cell; start-to-ready was shorter in the trajectory pair compared (11 s vs 19 s from `aspire start`
to both waits returning) but the agent still ran
`describe` to find the endpoints (3.0 per trial vs 2.0) and `ps` more (2.3 vs 0.5): nothing tells it
the port, and the README says endpoints are dynamic. A known port does not remove `describe`
unless the workspace tells the agent what it is.

**Plugin delivery (`t01b-plugin`, 3 luna `slow-sql` trials each).** `aspire agent init
--non-interactive --agents copilot --skills aspire --scope project --mcp=false` registers the plugin
at image build time without auth and without `copilot` on PATH, writing
`.github/copilot/settings.json` (marketplace `microsoft/aspire-skills` with no ref, so pinned to
`v0.0.6` by the image) and a user-level `postToolUse` telemetry hook. Plugin: 3/3 passed, no skill
loaded (0/3), 146 s; copy into `.github/skills`: 3/3, `aspire-monitoring` 1/3, 102 s. Selection
matches within one trial, so the arm definition stays the copy. But the trajectory does not show
whether Copilot CLI installed the plugin at all, and the copy arm rarely loads a skill on this cell
(0/3 on 11-09), so this cell cannot tell "delivered and unused" from "not delivered"; the trajectory logs request size only on failed calls and tokens only per trial, so the first prompt's size (which would show a skill listing) cannot be compared either
([FINDINGS F04](../FINDINGS.md#f04-capability-installation-and-actual-usage-must-be-verified-separately)).

**`aspire describe` bytes (no model).** Redirected table 4,244 → 5,282 bytes (+24 %): #22054 puts
the exit code in the State cell (`Finished (exit code: 0)`), which wraps each row's dashboard link
onto a third line; `--format Json` 24,902 bytes. Evidence: `evidence/agent-surface/2026-11-17/`;
patch 0002 still applies (T1.5).

**Cost.** Model cost recorded: $8.03 (`t01b`), $1.82 (sol bridge), $0.12 (plugin, warm); the
excluded incident rounds recorded $4.56 more, and 76 timed-out trials report none. About $14.5
in all against the card's $9.30.

### T0.2 Held-out application and fault

| | |
|---|---|
| Hypothesis | `aspire-diagnose` was written against the app and faults it is scored on; its first two steps are stack-neutral and should carry over, its third needs integration lines |
| Change | A second application in `msbench/`: minimal API + SQL Server + RabbitMQ consumer + static frontend, raw (Compose + start script + README) and aspirified (AppHost + ServiceDefaults), same calibration and verifier style as the telemetry suite. Three faults, of which **two run first**: a slow SQL Server query (log-visible: EF Core) and a RabbitMQ consumer blocked on an advisory lock held by a stalled process (log-silent: no exception, no error line, queue depth grows). The **third** (a cache-side fault on that app) is **reserved** and runs only if the skill is revised after the first two, so the gate is never judged on an in-sample fault. Setup asserts the silent fault's silence: zero error-level lines in the raw app's logs during the fault window, or the fixture is rejected. No skill edit before the first run |
| Arms | `raw`, `aspire-cli`, `aspire-skills-mcp`, `aspire-lean` |
| Cells | 2 faults × luna, terra × n = 6 |
| Decision rule | `aspire-lean` within +20% of raw on the log-visible fault and ahead on the silent one on both models: steps 1 and 2 generalise, ship gate open. Otherwise record what the agent needed, revise the skill once, label the re-run on the same two faults **in-sample**, and judge the gate on the reserved third fault only |
| Trials / cost | 2 × 4 × 2 × 6 = 96 ≈ $3.90, plus 48 ≈ $1.90 if the reserved fault runs, plus the fixture work (the largest engineering item in the plan) |
| Results | Done 2026-11-18. Round `t02` ([T0.2 results](#t02-results)): the luna log-silent cell was a tie (0.99×), which the user ruled not "ahead", so the gate was shut and the otherwise branch ran. `aspire-diagnose` step 1 was revised once, `t02-insample` re-ran both faults (reported only), and the reserved fault `heldout-cache` was built after the revision. **Gate open on `heldout-cache`** ([results](#t02-heldout3-results)): `aspire-lean` 0.81× (luna, 6/6 vs 5/6) and 0.61× (terra, 6/6 vs 6/6), both within +20 %. Cost $6.27 (`t02`) + $6.06 (`t02-insample`) + $3.38 (`t02-heldout3`) |

#### T0.2 decision rule, as computed (written 2026-11-18, before round `t02`)

The card's rule in numbers, fixed before any model trial:

- **Cells.** Round `t02`, scenarios `heldout-slow-sql` (log-visible) and `heldout-stuck-orders`
  (log-silent), models `gpt-6-luna` and `gpt-6.1-terra` (the terra ID every `t01b` cell used), n = 6
  per arm. A trial that `collect.py` marks as an infrastructure failure (timeout or crash with
  model-service 5xx) is re-run once in `t02-topup`; nothing else is re-run.
- **Time ratio** = median agent seconds of `aspire-lean` ÷ median agent seconds of `raw`, same
  scenario and model, over every graded trial (passed and failed), as `comparison.md` computes it.
  Medians over passing trials only are reported next to it but do not decide.
- **Within +20 % (log-visible)**, on each model: time ratio ≤ 1.20 **and** `aspire-lean` passes no
  more than one trial fewer than `raw`.
- **Ahead (log-silent)**, on each model: `aspire-lean` passes more trials than `raw`, **or** passes as
  many and the time ratio is < 1.00.
- **Gate open** only if all four model × fault conditions hold. Mann-Whitney p values are reported
  (floor 0.002 at 6 vs 6) and do not change the verdict.
- **Otherwise**: read the `aspire-lean` trajectories for what the agent needed, revise
  `aspire-diagnose` once, re-run both faults labelled `in-sample` (round `t02-insample`), and judge the
  gate on the reserved cache-side fault only, under the same two definitions with that fault counted
  as log-silent if the raw app's logs show nothing during its window and as log-visible otherwise.

#### T0.2 results

> **Superseded 2026-11-18.** The user ruled the 0.99× tie below not "ahead"; the gate was judged on the
> reserved third fault instead ([ruling](#t02-ruling-and-amended-rule-written-2026-11-18-after-t02-before-any-t02-insample-or-heldout-cache-trial),
> [results](#t02-heldout3-results)). This paragraph is kept as written after `t02`.

**Verdict (as first written): gate open by the pre-registered rule, on a tie in the deciding cell.** All four conditions
hold, so `aspire-diagnose` is not revised, nothing is re-run in-sample and the reserved cache-side fault
stays unimplemented. But the luna log-silent condition ("ahead") is met by 0.8 s: `aspire-lean` 81.4 s
against `raw` 82.2 s, both 6/6, p = 0.82. That is a tie, and the verdict rests on it; whether a tie
should count as "ahead" is the user's call (open item 1). The trajectories also show that step 1 of the
skill did **not** carry over to this symptom (below), so "steps 1 and 2 generalise" holds for the
log-visible fault only.

**Application and faults.** Shop (`msbench/heldout/app`; packagings in `common/heldout/`): minimal API
that also serves a static storefront, SQL Server 2022 CU28, RabbitMQ 4.3, an order worker that allocates
stock under `sp_getapplock('inventory')`. Business code is identical in both packagings except
`servicedefaults.patch` (the `Aspire:UseServiceDefaults` gate, as in Bingo); the aspirified app gets the
SQL Server and RabbitMQ client tracing Aspire's client integrations enable (`AddSqlClientInstrumentation`,
`RabbitMQ.Client.Publisher`/`Subscriber`), the raw app none. `heldout-slow-sql` (log-visible): carrier
webhooks stored as raw JSON, the order page filters them with `JSON_VALUE` and no index; calibrated to
≥ 500 ms per page (remote gates: 912–922 ms; local, emulated amd64: 1 M rows, 690–770 ms); setup asserts
EF Core's `Executed DbCommand (N ms)` line with the statement is in the raw `api.log`.
`heldout-stuck-orders` (log-silent): a host job (`stock-reconcile.sh`) holds the lock in an open
transaction, stalled on its supplier feed; the worker waits 15 s, logs at Debug only and retries the
same message. Setup rejects the fixture on any error-level line in the window; a 22-minute local soak
under the fault logged none, and 409 queued messages survived ~80 redeliveries and drained after the
repair. In the aspirified app the wait shows as 15 s `deliver orders` spans whose child `EXEC` span
carries the `sp_getapplock` text, inside the API's `POST /api/orders` trace (only because the worker's
lock timeout ends each wait; an unbounded wait would export no span). Prompts: in
`gen-tasks.mjs`, symptom only.

**Gates.** Local, every cell (2 faults × `raw`, `aspire-cli`/`none`, `aspire-skills-mcp`/`current`,
`aspire-lean`/`lean`): verify fails → reference repair → verify passes, 8/8. Must-fail repairs run once
each, all failed as intended: purge the queue then kill the holder (backlog never confirmed), confirm
pending orders in SQL (stock invariant), delete carrier history (history check). Remote `gate-t02`, all
reward 1: `heldout-slow-sql` `2026111831021442` (raw), `…023818`, `…026032`, `…028462`;
`heldout-stuck-orders` `…030812` (raw), `…033058`, `…035276`, `…037424`. Probe `probe-t02` (one luna
`raw` trial per fault, `2026111831539882`, `…542474`): both passed, no timeout, no 5xx; tagged
`excluded` in the ledger because the rule is computed on round `t02` only (pooled, see below).

**Round health (`t02`, 96 trials, tasks `c4c67064`, pin `2026-11-17`).** No timeout, no crash, no
exclusion; one luna trial saw a model-service 5xx (2.8 s lost); median 5xx wait 0 s. One luna `raw`
slow-sql trial (`2026111832109234`, passed) read `/opt/benchmark/traffic.mjs` and `state.json` after
finding the traffic generator with `ps` ([F26](../FINDINGS.md#f26-agents-find-the-traffic-generator-through-ps-and-read-it-only-a-per-run-leak-check-catches-it));
kept and flagged; without it raw luna slow-sql is 252 s and lean ÷ raw 0.63×, so the verdict does not
depend on it.

**Ratios to `raw`, round `t02`, n = 6 per cell** (computed on `t02` alone; since `t02-insample` the
linked `comparison.md` and `stats.md` pool both rounds, pre- and post-revision; medians over all graded trials; time = agent seconds,
tokens = input tokens; p = exact Mann-Whitney on time against raw; skill = trials that loaded a skill;
[comparison.md](results/comparison.md), [stats.md](results/stats.md)):

| Scenario | Model | Arm | Time | Time ÷ raw | Tokens | Tokens ÷ raw | Pass | Skill | $/trial | Run IDs |
|---|---|---|---:|---:|---:|---:|---|---|---:|---|
| heldout-slow-sql | luna | raw | 237 s | — | 553k | — | 6/6 | 0/6 | 0.018 | `2026111832107808`…`111082` |
| heldout-slow-sql | luna | aspire-cli | 120 s | 0.51× (p=0.015) | 420k | 0.76× | 6/6 | 0/6 | 0.013 | `2026111832114908`…`118094` |
| heldout-slow-sql | luna | aspire-skills-mcp | 145 s | 0.61× (p=0.002) | 720k | 1.30× | 6/6 | 5/6 | 0.018 | `2026111832122042`…`125310` |
| heldout-slow-sql | luna | **aspire-lean** | 160 s | **0.67×** (p=0.093) | 512k | 0.92× | 6/6 | 6/6 | 0.015 | `2026111832129224`…`132588` |
| heldout-slow-sql | terra | raw | 328 s | — | 744k | — | 6/6 | 0/6 | 0.138 | `2026111832165438`…`168682` |
| heldout-slow-sql | terra | aspire-cli | 216 s | 0.66× (p=0.009) | 571k | 0.77× | 6/6 | 0/6 | 0.113 | `2026111832172780`…`176000` |
| heldout-slow-sql | terra | aspire-skills-mcp | 298 s | 0.91× (p=0.394) | 859k | 1.15× | 6/6 | 6/6 | 0.156 | `2026111832179852`…`182948` |
| heldout-slow-sql | terra | **aspire-lean** | 278 s | **0.85×** (p=0.240) | 804k | 1.08× | 6/6 | 6/6 | 0.145 | `2026111832186934`…`190174` |
| heldout-stuck-orders | luna | raw | 82 s | — | 313k | — | 6/6 | 0/6 | 0.010 | `2026111832136640`…`139806` |
| heldout-stuck-orders | luna | aspire-cli | 110 s | 1.34× (p=0.240) | 383k | 1.22× | 5/6 | 0/6 | 0.013 | `2026111832143742`…`147238` |
| heldout-stuck-orders | luna | aspire-skills-mcp | 208 s | 2.53× (p=0.002) | 1,489k | 4.76× | 4/6 | 6/6 | 0.031 | `2026111832151172`…`154290` |
| heldout-stuck-orders | luna | **aspire-lean** | 81 s | **0.99×** (p=0.818) | 318k | 1.02× | 6/6 | 6/6 | 0.010 | `2026111832158228`…`161536` |
| heldout-stuck-orders | terra | raw | 122 s | — | 325k | — | 6/6 | 0/6 | 0.075 | `2026111832194042`…`197214` |
| heldout-stuck-orders | terra | aspire-cli | 92 s | 0.76× (p=0.240) | 271k | 0.83× | 6/6 | 0/6 | 0.073 | `2026111832201106`…`204212` |
| heldout-stuck-orders | terra | aspire-skills-mcp | 137 s | 1.12× (p=0.818) | 496k | 1.53× | 6/6 | 6/6 | 0.102 | `2026111832208020`…`211086` |
| heldout-stuck-orders | terra | **aspire-lean** | 90 s | **0.74×** (p=0.041) | 311k | 0.96× | 6/6 | 6/6 | 0.075 | `2026111832214960`…`218074` |

Rule check: log-visible 0.67× (luna) and 0.85× (terra), 6/6 against 6/6, within +20 %; log-silent
0.74× (terra, ahead) and 0.99× (luna, ahead only by the letter of the rule). With the probe trial pooled
into `raw` (n = 7, as the pooled tables would show it without the exclusion), luna log-silent is
`aspire-lean` +4 % (p = 1.0) and the condition fails; luna log-visible is −28 % (p = 0.14). Passing-trial
medians equal the all-trial medians in every `aspire-lean` and `raw` cell (no failures there).

**What the agents did, read from the trajectories** (tallies over every `t02` trial):

- **Every trial in every arm read the application source** (96/96). The source shows both mechanisms:
  the `JSON_VALUE` statement is in `Program.cs`, the lock call in `InventoryLock.cs`, and the lock's
  comments name "the stock reconciliation job" as its other user. This is the same in every arm, but it
  gives the raw agent a route the card did not intend; a comment-free re-run is open item 2. The raw
  agent's own "seen" marker on slow-sql fires on that source read (8.8 s luna, 12.4 s terra), so the
  log line the fault was built around was never what led the raw agent to the cause.
- **Log-visible: steps 1 and 2 carried over.** Every `aspire-lean` trial went to telemetry before the
  source (12/12) and telemetry put the slow statement on screen in 6/6 (luna) and 5/6 (terra) trials,
  e.g. `2026111832129224`. The time difference against raw is not diagnosis: the culprit was on screen
  within 8–20 s in every arm. It is the restart after the fix. Every slow-sql trial in every arm
  patched code (an EF-mapped computed column or a rewritten query; 48/48, half of them also ran the DDL
  by hand) and restarted the API; raw's start script supervises the processes and stops everything if the API exits, so
  raw agents spent 166 s (luna) and 228 s (terra) after the first fix restarting safely, one building its
  own supervisor and a scratch database (`2026111832165438`, steps 29–45), against 60–77 s (luna) and
  110–193 s (terra) with `aspire resource api restart/rebuild`. `aspire-cli` is fastest for the same
  reason with the least reading (no skill text).
- **Log-silent: step 1 did not carry over.** All 6 luna and 6 terra `aspire-lean` trials loaded
  `aspire-diagnose` and went to telemetry first, but the 15 s `sp_getapplock` span reached the screen in
  only 2/6 per model. Step 1 offers "slow: `--search duration:>500`" or "failing: `--has-error`,
  `--severity Error`"; "orders stay pending, nothing fails" is neither, and most trials picked the error
  filters, which return nothing for a silent fault (`2026111832160860` steps 3–4). They recovered as raw
  did: source, then SQL Server sessions (`sys.dm_exec_sessions`/`dm_exec_requests`/`dm_tran_locks`; 12/12
  lean, 12/12 raw), then ended the holder: `KILL <spid>` (luna lean 6/6, luna raw 5/6, terra lean 5/6),
  or, the route terra preferred elsewhere (raw 6/6, `aspire-cli` and `aspire-skills-mcp` 4/6 each),
  closing the job's empty supplier feed so the job committed and released the lock itself
  (`2026111832194042` step 17), which the verifier accepts. The skill's step 3 has no SQL Server line; agents wrote `sqlcmd`
  calls themselves, which is the step-3 gap the card predicted.
- **The shipped set with MCP is the outlier.** Luna `aspire-skills-mcp` on the silent fault: 2.53× time,
  4.76× tokens, 4/6. The MCP `list_traces` output carried the lock span in 6/6 trials (42 KB per call in
  `2026111832151172`), but 5/6 trials read it as a worker bug and patched `OrderConsumer.cs`; both failures
  rebuilt the worker and never ended the holder (verifier: lock still held, 81–82 orders unconfirmed).
  The one `aspire-cli` luna failure (`2026111832145844`) did the same.
- Phase-marker caveat: on `heldout-stuck-orders` the "seen" marker also fires on a `ps` listing that
  shows `stock-reconcile.sh` (e.g. `aspire-cli` luna 3.2–4.9 s), the flaw T0.1 noted; it is not quoted.

**Proposal (acted on after the ruling, in `5be0a4d`; see below).** Step 1 of `aspire-diagnose` needs a branch for "work is
not progressing, nothing fails": look for long spans of any kind (`--search duration:>5000`) and for
consumers with no recent successful traces, rather than error filters. The gap is stack-neutral, which
is the condition under which T1.1 unfreezes steps 1 and 2; it would need its own held-out check.

**Cost.** Model cost recorded: $6.25 for `t02` (luna $0.84, terra $5.41) plus $0.02 for the probe; gates
are model-free. The card estimated $3.90: terra cost $0.113 per trial against the $0.065 assumed from the
Bingo cells, because held-out terra trials are longer (slow-sql raw 328 s, 744k input tokens).

**Open items.** (1) Decide whether a 0.99× tie meets "ahead" for the luna log-silent cell; if not, the
card's "otherwise" branch applies (revise step 1 once, re-run in-sample, implement the reserved fault).
(2) Re-run both faults with the lock comments removed from the source, so the raw route cannot read the
holder's name, before T1.1 relies on this gate. (3) The time-to-root-cause marker needs the `ps` fix
before it can be quoted for this scenario. (4) T1.1's held-out cells (`gpt-6.2-sol`, `claude-opus-5.5`)
remain.

#### T0.2 ruling and amended rule (written 2026-11-18, after `t02`, before any `t02-insample` or `heldout-cache` trial)

**Ruling.** The user ruled that the luna log-silent tie (0.99×, 6/6 against 6/6, p = 0.82) is **not**
"ahead". The `t02` gate is therefore **not open**, and the card's "otherwise" branch applies. The `t02`
numbers and the rule above stay as they were written; only the reading of "ahead" changes.

**Amended "ahead"** (my choice, made so that the rejected tie fails it): `aspire-lean` passes more trials
than `raw`, **or** passes as many and the time ratio is **≤ 0.90**. "Within +20 %" is unchanged. Under
this definition `t02` fails on luna log-silent (0.99×) and passes the other three conditions.

**What follows, in this order.**

1. Revise step 1 of `aspire-diagnose` once, from the proposal above (what the `t02` `aspire-lean`
   trajectories needed): its triggers and its symptom list also cover work that is stuck, pending or
   not progressing, in stack-neutral wording; nothing else in the skill changes (steps 2–4 and the
   dependency lines of step 3, which belong to T1.1, stay as they are). The revision is committed before
   the cache-side fault is designed. The skill lives in `common/skills/new/`, so it also reaches the
   `plus`, `lean` and `lean-start` sets on the Bingo scenarios from this re-pin on.
2. Round `t02-insample`: both held-out faults, all four arms (`aspire-skills-mcp` carries the unchanged
   shipped skills and serves as the control), luna and `gpt-6.1-terra`, n = 6, the app unchanged (lock
   comments included) so that it compares with `t02`. Labelled in-sample; it is reported and decides
   nothing.
3. Scenario `heldout-cache` (the reserved fault) and round `t02-heldout3`: the same four arms × two
   models × n = 6. **The gate is judged on this round only**, with "within +20 %" if the raw app's logs
   show the fault during its window and the amended "ahead" if they show nothing; setup asserts which one
   holds before any trial. The card's original reading of "ahead" (ratio < 1.00) is reported next to it.
   Same infrastructure re-run rule as `t02` (`t02-heldout3-topup`).

**The reserved fault, as built (written before its remote gate).** `heldout-cache` ships as a code
regression applied to its own image only (`common/heldout/faults/heldout-cache.patch`), so the
in-sample cells run the unchanged app. The catalogue gained the week's units sold and shoppers per
product and member prices, and its in-memory cache is keyed per shopper. Live traffic comes from a
pool of 50,000 shoppers, so nearly every page view ranks the week's orders again. It is log-visible
by construction (EF Core logs the ranking statement with its duration; setup asserts the line), so
**"within +20 %" decides**. The verifier records three checks and the reward needs all three:
- **fast:** median catalogue time under 150 ms for twelve shoppers new to the cache;
- **root cause:** at most 2 reads of `Orders` across those twelve page views, from
  `sys.dm_db_index_usage_stats`;
- **functional:** sales, shopper counts and member prices correct, members kept, order flow and stock
  intact.

**An index alone fails.** A covering index on `Orders (Status, PlacedAt)` cut the page from 523 ms to
422 ms locally, which is still over the limit, and the order history is still read for every new
shopper. A longer cache lifetime (600 s) with a restart also fails, on both checks. Pass counts in the
rule use the reward. The "fast only" rate is reported beside it.

#### T0.2 heldout3 results

**Verdict: ship gate open, judged on the reserved third fault only.** `heldout-cache` is log-visible
(setup asserted EF Core's slow ranking line in the raw `api.log` in every raw trial), so "within +20 %"
decides. Luna: `aspire-lean` 235 s against `raw` 288 s, 0.81× (p = 0.39), 6/6 against 5/6. Terra:
253 s against 412 s, 0.61× (p = 0.065), 6/6 against 6/6. Both conditions hold. The card's original
"ahead" reading and the amended one do not apply to a log-visible fault, so they cannot disagree here.

**What the gate does not show.** The reserved fault turned out log-visible, the class `t02` had already
passed (0.67×, 0.85×). No `t02-heldout3` trial used the revised step-1 branch (no `duration:>5000`
search in any cache cell), so the revision was never exercised out of sample. Its effect on the silent
symptom that shut the gate is in-sample evidence only, and there the time stayed within round-to-round
noise. "Open by the card's rule" holds; "the revision generalises to a silent fault" is not shown. A
held-out **log-silent** fault is the open item that would show it (open item 6).
The revision did what it was written for on the in-sample silent fault (the lock span reached the
screen in 12/12 `aspire-lean` trials, against 4/12 in `t02`), but the time to repair did not follow:
in-sample `aspire-lean` is 0.86× (luna) and 0.83× (terra), and its absolute terra time rose from 90 s to
113 s. On the held-out fault the skill's advantage over raw is again the restart, not the diagnosis
(below), as it was for `heldout-slow-sql` in `t02`.

**Order of work, from the commits.** Ruling and amended rule `28ea19e` and `a506368`. Skill revision
`5be0a4d`, verified without a model in a local `heldout-stuck-orders` aspire cell: `duration:>5000`
returned the 15 s `POST /api/orders` trace that holds the lock wait, and the error filters returned
nothing. Cache fault and harness `305a8ed`, then tasks `1479041` and dataset `a74a14b`. The skill edit
adds one command and one symptom bullet to step 1 and widens the trigger description. Steps 2–4 are
unchanged.

**Gates.** Local, `heldout-cache`, `raw` and `aspire-lean` cells: verify fails, reference repair,
verify passes (raw 523 → 2–9 ms, aspire 674 → 2–19 ms, 0 order reads after the repair). The
`aspire-cli` and `aspire-skills-mcp` cells differ from `aspire-lean` only in skill files; their local gate
was not run, and the remote gate covers them. Must-fail repairs, each run once locally, all failed as
intended:
- a covering index alone (523 → 422 ms, still read per shopper);
- a 600 s cache lifetime with a restart (469 ms, 12 reads);
- the first, I/O-bound calibration, rejected and replaced by a settled one (below).

Remote `gate-t02b` returned reward 1 in all 12 cells: every held-out scenario × arm on the new pin,
`2026111859821658`…`853572`. The cache cells' baselines under traffic were 808–1137 ms.

**Fixture note.** The first calibration grew rows until a page cost 856 ms. Under traffic the
ranking was bimodal (median about 350 ms, tail 1–2.5 s) because the order table outgrew the 2 GB
SQL Server memory limit. The fix added `COUNT(DISTINCT Customer)`, raising the cost per row
instead of the row count. Setup now grows the data until a page costs 700 ms after a `CHECKPOINT`. It
then measures again under live traffic and rejects the fixture below 500 ms. A local aspire cell was
rejected once by that check (444 ms) before the target was raised from 500 to 700 ms.

**Round health.** 11 of 144 first-pass trials failed before the agent started. The image build could
not download `packages.microsoft.com`'s signing key (curl exit 22). They are infrastructure failures
and were re-run once, all completing, in `t02-heldout3-topup` (5) and `t02-insample-topup` (6). The
pre-registered infrastructure rule names timeouts and crashes with 5xx. A build failure before the agent
starts is not literally in it, but no trial ran, so the same rule was applied. First-pass trials only
(no top-ups): `aspire-lean` 0.68× (luna, `raw` 3/3) and 0.58× (terra, `raw` 5/5), the same verdict. The
only raw failure is itself a top-up trial. Failed first-pass IDs: `2026111860490640`, `…491294`,
`…492562`, `…519368`, `…529308` (cache); `2026111860551988`, `…566096`, `…587400`, `…603846`, `…607896`,
`…637216` (in-sample). No
timeout or crash. One model-service 5xx per round (23.9 s lost in `2026111860542120`, `aspire-lean`
terra cache; 0.6 s in `t02-insample`). No trial read the harness (F26 check).

**`t02-heldout3`, the gate** (n = 6 per cell; `raw` luna 3 and terra 1, and `aspire-cli` terra 1, are
top-ups; time = agent seconds, medians over all graded trials; p = exact Mann-Whitney against raw;
fast/cause = the verifier's separate checks):

| Model | Arm | Time | Time ÷ raw | Tokens ÷ raw | Pass | Fast / cause | Skill | $/trial | Run IDs |
|---|---|---:|---:|---:|---|---|---|---:|---|
| luna | raw | 288 s | — | — | 5/6 | 5/6, 5/6 | 0/6 | 0.023 | `2026111860489978`…`493226` (first pass, 3), top-ups `2026111862945490`, `2026111862946160`, `2026111862946850` |
| luna | aspire-cli | 214 s | 0.74× (p=0.13) | 0.74× | 6/6 | 6/6, 6/6 | 0/6 | 0.019 | `2026111860497224`…`500564` |
| luna | aspire-skills-mcp | 176 s | 0.61× (p=0.015) | 1.47× | 6/6 | 6/6, 6/6 | 6/6 | 0.026 | `2026111860504706`…`507956` |
| luna | **aspire-lean** | 235 s | **0.81×** (p=0.39) | 0.96× | 6/6 | 6/6, 6/6 | 6/6 | 0.021 | `2026111860511998`…`515318` |
| terra | raw | 412 s | — | — | 6/6 | 6/6, 6/6 | 0/6 | 0.141 | `2026111860520032`…`522640`, top-up `2026111862950076` |
| terra | aspire-cli | 211 s | 0.51× (p=0.002) | 0.54× | 6/6 | 6/6, 6/6 | 0/6 | 0.095 | `2026111860526628`…`529962`, top-up `2026111862952836` |
| terra | aspire-skills-mcp | 237 s | 0.57× (p=0.015) | 0.94× | 6/6 | 6/6, 6/6 | 6/6 | 0.126 | `2026111860533994`…`537292` |
| terra | **aspire-lean** | 253 s | **0.61×** (p=0.065) | 0.69× | 6/6 | 6/6, 6/6 | 6/6 | 0.113 | `2026111860541430`…`544656` |

The one failure (`2026111862946160`, raw luna) fixed the cache key and tested it on a second API it
started on port 18091. It never restarted the live API, which kept serving the old code (585 ms,
12 reads).

**What the agents did on the held-out fault** (tallies over every graded `t02-heldout3` trial):
- **Every trial read the source** (48/48). The per-shopper key `$"products:{customer}"` sits on the
  endpoint, which the first `Program.cs` read shows. That read came within a median 8–24 s in every
  cell except terra `aspire-lean` (43 s).
- **Telemetry put the ranking statement on screen** in 6/6 `aspire-lean` and 6/6 `aspire-skills-mcp`
  trials on both models, against 3/6 for `aspire-cli`. Luna `aspire-lean` went to telemetry before the
  source in 6/6 trials, terra in 2/6 (terra issues both in one parallel batch).
- **An index first is common, with or without the skill.** Agents created an index on `Orders` before
  fixing the cache key in: luna `aspire-lean` 5/6, luna `raw` 4/6, terra `raw` 4/6, luna `aspire-cli`
  2/6, terra `aspire-lean` 2/6, terra `aspire-cli` 0/6 and `aspire-skills-mcp` 1/6 (luna) and 0/6 (terra).
  Step 2's "one child span takes almost the whole duration: that dependency call is the cause" points
  at the statement, and the statement's cost then hides the cache. Every passing trial went on to fix
  the key (the root-cause check requires it).
- **The time difference is again the restart.** Median time to the first `Program.cs` edit: raw 84 s
  (luna) and 180 s (terra); `aspire-lean` 81 s and 114 s; `aspire-cli` 76 s and 78 s. Time from that
  edit to the end (difference of medians): raw 204 s and 232 s, against `aspire-lean` 154 s and 139 s
  and `aspire-cli` 138 s and 133 s. The raw start script stops everything when the API exits, so raw
  agents restart the whole application (as in `t02`). Aspire agents used `aspire resource api
  rebuild`/`restart` (12/12 `aspire-lean`).

**`t02-insample`, labelled in-sample** (same two faults as `t02`, revised skill, unchanged app, n = 6;
six top-ups listed by ID; reported only):

| Scenario | Model | Arm | Time | ÷ raw | `t02` ÷ raw | Pass | Run IDs |
|---|---|---|---:|---:|---:|---|---|
| heldout-slow-sql | luna | raw | 234 s | — | — | 6/6 | `2026111860548676`…`551340`, top-up `2026111862955526` |
| heldout-slow-sql | luna | aspire-cli | 128 s | 0.55× (p=0.002) | 0.51× | 6/6 | `2026111860556092`…`559376` |
| heldout-slow-sql | luna | aspire-skills-mcp | 133 s | 0.57× (p=0.026) | 0.61× | 5/6 | `2026111860563542`…`566742`, top-up `2026111862958292` |
| heldout-slow-sql | luna | **aspire-lean** | 189 s | **0.81×** (p=0.065) | 0.67× | 6/6 | `2026111860570842`…`574076` |
| heldout-slow-sql | terra | raw | 400 s | — | — | 6/6 | `2026111860608542`…`611198`, top-up `2026111862966454` |
| heldout-slow-sql | terra | aspire-cli | 311 s | 0.78× (p=0.015) | 0.66× | 6/6 | `2026111860615322`…`618546` |
| heldout-slow-sql | terra | aspire-skills-mcp | 413 s | 1.03× (p=0.94) | 0.91× | 6/6 | `2026111860622594`…`625796` |
| heldout-slow-sql | terra | **aspire-lean** | 339 s | **0.85×** (p=0.065) | 0.85× | 6/6 | `2026111860629804`…`633132` |
| heldout-stuck-orders | luna | raw | 91 s | — | — | 6/6 | `2026111860578066`…`581298` |
| heldout-stuck-orders | luna | aspire-cli | 120 s | 1.32× (p=0.093) | 1.34× | 6/6 | `2026111860585478`…`588744`, top-up `2026111862961026` |
| heldout-stuck-orders | luna | aspire-skills-mcp | 300 s | 3.30× (p=0.009) | 2.53× | 4/6 | `2026111860592856`…`596260` |
| heldout-stuck-orders | luna | **aspire-lean** | 78 s | **0.86×** (p=0.39) | 0.99× | 6/6 | `2026111860600402`…`603186`, top-up `2026111862963710` |
| heldout-stuck-orders | terra | raw | 137 s | — | — | 6/6 | `2026111860637890`…`640540`, top-up `2026111862969212` |
| heldout-stuck-orders | terra | aspire-cli | 95 s | 0.69× (p=0.18) | 0.76× | 6/6 | `2026111860644564`…`647882` |
| heldout-stuck-orders | terra | aspire-skills-mcp | 108 s | 0.79× (p=0.39) | 1.12× | 6/6 | `2026111860651886`…`655522` |
| heldout-stuck-orders | terra | **aspire-lean** | 113 s | **0.83×** (p=0.24) | 0.74× | 6/6 | `2026111860659500`…`662848` |

- **The revision reached the screen.** On `heldout-stuck-orders`, `aspire-lean` ran `duration:>5000`
  (or higher) in 5/6 (luna) and 6/6 (terra) trials, and the `sp_getapplock` span was on screen in 6/6 and
  6/6, against 2/6 and 2/6 in `t02`. All 12 ended the holder with `KILL <spid>`. The error filters were
  still run alongside, in 4/6 per model.
- **Time did not move with it.** `aspire-lean` absolute times: luna 78 s (`t02` 81 s), terra 113 s (90 s).
  Raw moved by about as much between rounds (82 → 91 s, 122 → 137 s), so the ratios (0.86×, 0.83×) sit
  inside round-to-round noise. The unchanged control shows the size of that noise: `aspire-skills-mcp`
  went 2.53× → 3.30× (luna silent) and 0.91× → 1.03× (terra slow-sql) with nothing changed. Its luna
  silent failure mode repeated (4/6; 3/6 edited `OrderConsumer.cs`).
- Under the amended "ahead" (≤ 0.90×), both in-sample silent cells would pass. They are in-sample and
  decide nothing.

**Cost.** Model cost: `t02-heldout3` $3.38 (top-ups included) against the card's $1.90 for the reserved
fault, and `t02-insample` $6.06. The card had no line for the in-sample re-run, and its `t02` analogue
was estimated at $3.90. Together $9.44 against about $1.90 remaining on the card. Terra trials cost
$0.095–0.170 each on this app, against the $0.065 the estimate assumed. Gates are model-free; the
11 build failures cost nothing.

**Open items.**
1. Step 2 leads to an index first on a cached-path fault: "that dependency call is the cause" is read
   as "make the call faster" (luna `aspire-lean` 5/6). A line such as "a call that should not happen at
   all (cached, batched) is fixed in the caller" would be a stack-neutral step-2 edit. It needs its own
   held-out check, because this fault is now in-sample for it.
2. Re-run without the lock comments (carried over from `t02`). The cache fault's source shows its key
   just as plainly, so every arm reads the cause in the source; telemetry's lead is over the restart.
3. The `heldout-cache` "fix" marker only matches a constant-key `GetOrCreate` call (0–4/6 matches in
   cells that passed 6/6). It is not quoted.
4. `results/comparison.md` and `stats.md` pooled `t02` and `t02-insample` (same Aspire pin). Since the
   T0.3 follow-up they split `aspire-lean` by skill revision (the other arms' skills did not change);
   the per-round tables above are computed from `trials.jsonl` per round.
5. T1.1's held-out cells (`gpt-6.2-sol`, `claude-opus-5.5`) remain, now on `heldout-cache` as the
   held-out fault.
6. A held-out log-silent fault, built after this revision, to test the step-1 branch out of sample.
   Not built: the card reserved one third fault, and it turned out log-visible.
7. `skills_sha` in the ledger did not change with the revision (it records the shipped skills tag), so
   `series.py` could not separate pre- and post-revision `aspire-lean` rows. Resolved: the results
   files now key cells on the skill content derived from `task_repo_commit` (T0.3 results, "Skill
   revisions within a pin").

### T0.3 Series tooling

| | |
|---|---|
| Change | `tools/series.py` and `results/series.jsonl` as specified in REPORT §11.3: one row per cell per round with ratio to raw, trailing medians, flags; `ledger.jsonl` rows gain `task`, `aspire_build`, `skills_sha` |
| Decision rule | Not a benchmark. Done when T0.1's round appears in `series.md` next to the 11-09 round |
| Results | Done 2026-11-18: [T0.3 results](#t03-results) below. `results/series.md` shows run `t01b` next to the pooled 11-09 run for every cell, with the incident rounds left out; the first pass flagged four trials that read harness files ([F26](../FINDINGS.md#f26-agents-find-the-traffic-generator-through-ps-and-read-it-only-a-per-run-leak-check-catches-it)) |

#### T0.3 results

**What exists.** [`tools/series.py`](tools/series.py) reads `trials.jsonl` and the ledger (`task`,
`submitted_at`, `task_repo_commit`; `aspire_build` and `skills_sha` reach the rows through
`collect.py`) and writes [`results/series.jsonl`](results/series.jsonl) (154 rows, one per cell per
run) and [`results/series.md`](results/series.md) (a runs table, then one table per scenario × model
× harness with n, pass, median seconds and their MAD, tokens, ratio to `raw`, the trailing median of
that ratio, skill selection, MCP calls, characters read, flags and a spark line of the time ratio).
A cell is (harness, scenario, model, arm); `submit.sh` already wrote `task`, `aspire_build` and
`skills_sha` since T0.1, and T0.4 adds `agent`. Oracle gates, infrastructure failures and every row
with an `excluded` reason are left out, so `t01`, `t01-solbridge`, `t01-plugin`, `t01-warm` and
`t01-topup` do not appear.

**What a run is.** No round of the first pin has the whole matrix with its own `raw` (rounds `r1`
to `r5` ran `raw-check`; `raw` exists only in `r6`, `r6b`, `r7`, `r7b`), so the first pin is one
pooled run, exactly as `comparison.md` and the T0.1 table pool it. Later runs are the round name up
to the first `-`: `t01b`, `t01b-solbridge`, `t01b-plugin` and `t01b-warm` form run `t01b`, so the
plugin cell divides by the `t01b` raw. A cell with no `raw` in its run is flagged `no-raw`
(`cold-start-warm`, which has no raw arm). Ratios reproduce the T0.1 table to the second decimal
(for example `slow-sql`/luna/`aspire-cli` 2.26× → 1.97× time, 2.66× → 2.76× tokens).

**Skill revisions within a pin (added after T0.2).** The ledger's `skills_sha` records only the
shipped skills tag, so a skill revised without a re-pin (T0.2 step 1, suite `305a8ed`) left pre- and
post-revision trials in one cell. `collect.py` now fingerprints the skill files each trial's image
received (the task's skill set, composed from the suite commit its `task_repo_commit` builds from)
and, where one pin, scenario, model, harness and arm holds two fingerprints, labels the arm with the
first task commit that carried each (`cell_arm` in `trials.jsonl`). `summary.md`, `comparison.md`,
`stats.md` and `series.md` key cells on it; lines without `task_repo_commit` (the first pin) keep
their grouping. Today this splits four cells: held-out `heldout-slow-sql` and `heldout-stuck-orders`
× luna and terra × `aspire-lean`, into `(tasks 916a57ce)` (round `t02`, old step 1) and
`(tasks 1479041e)` (`t02-insample`, revised). No Bingo trial has run on the revised tasks yet. In the
series the revised row is a second point of run `t02`; it flags `regress-time` on
`heldout-stuck-orders`/terra (0.69× → 0.86×, n = 6 against 6).

**Flags.** As REPORT §11.2, against the median of the cell's last five earlier runs: a pass drop of
at least 0.4 × n trials with binomial p < 0.05, a time or token ratio 25 % above the trailing median
with a rank-sum p < 0.05 of the run's per-trial ratios (trial ÷ same-run raw median) against the
pooled window's, the mirror images as `improve-*`, skill selection under 80 % on an arm that ships
skills, and any harness-path access. The rank-sum test is exact up to 200,000 permutations and a
tie-corrected normal approximation beyond. A suite change that breaks comparability starts a new
window through `WINDOW_STARTS` (a re-pin does not). With only the pooled 11-09 run behind it, `t01b`
gets: `improve-time` on `slow-sql`/luna/`aspire-skills-mcp` (3.10× → 2.24×), `read-only`/luna
`aspire-cli` and `aspire-lean`, and `slow-redis`/luna `aspire-cli` and `aspire-skills-mcp`;
`regress-time` on `slow-redis`/terra/`aspire-cli` (0.60× → 1.03×, p = 0.048 against an n = 3 window);
`regress-tokens` on `cold-start`/luna/`aspire-cli` and `cold-start`/terra/`aspire-lean`;
`selection-low` on luna `slow-sql` `aspire-skills` and `aspire-skills-plugin` and on luna
`read-only` and `slow-redis` `aspire-skills-mcp`. Every one of these is a cell T0.1 already explained
(mostly the raw denominator moving). Until the window holds several runs, a flag says "look", not
"regression"; on luna §11.3's rule (repeat the cell before an issue) applies.

**Leaks.** `leak` flagged `t01b` `read-only`/luna/`raw`, `t01b-plugin` `slow-sql`/luna/`aspire-skills`
and 11-09 `slow-redis`/luna/`raw`: agents found `/opt/benchmark/traffic.mjs` through `ps` and read it
and its state files, and one excluded trial also opened `/opt/benchmark/bench.mjs`, the verifier.
None of the per-card reviews had reported them, since `protected_path_access` was in `trials.jsonl`
but in no table ([F26](../FINDINGS.md#f26-agents-find-the-traffic-generator-through-ps-and-read-it-only-a-per-run-leak-check-catches-it)).
The fixture is unchanged; moving `verify` into `tests/` is the fix proposed there.

**Not done.** The schedule (§11.3 step 3) and opening an issue on a flag are not built; the first
flagged run should be read by hand.

### T0.4 Harness adapters for the VS Code lane

| | |
|---|---|
| Change | `tools/submit.sh` takes an agent (`github-copilot-cli` pinned as today, `vscode`, `claude-code`) and records it in the ledger; `gen-tasks.mjs` emits the MCP registration the chosen harness reads (`.vscode/mcp.json` for VS Code, the Copilot CLI config as today) and keeps skills in `.github/skills`, which VS Code agent mode and Copilot CLI both discover; a `user-overrides.yaml` asset with `chat.tools.global.autoApprove: true` so VS Code runs unattended; `tools/collect.py` gains a trajectory reader for the VS Code agent's event format so phase markers, skill loads and MCP calls are derived the same way |
| Check | Three luna `slow-sql` trials on `aspire-lean` under `vscode`: the skill is loaded, the trajectory parses, the verifier grades |
| Decision rule | Done when the check passes and a `vscode` row in `trials.jsonl` has every field a Copilot CLI row has |
| Trials / cost | 3 ≈ $0.05 |
| Results | Done 2026-11-18: [T0.4 results](#t04-results) below. Check passed: 3/3 reward 1, `aspire-diagnose` loaded 3/3, every Copilot CLI field derived. VS Code runs are read from the Copilot Chat span store, because the trajectory file the run returns describes a subagent ([F28](../FINDINGS.md#f28-under-the-vscode-harness-harbors-trial-result-describes-a-subagent-not-the-agent)); each trial loses 186 s to a WebSocket fallback, which must be subtracted before T1.9 |

#### T0.4 results

**Adapters.** `tools/submit.sh` takes the harness from `BENCH_AGENT` (positional arguments unchanged):
`github-copilot-cli` (default, pinned as before), `vscode` (package `vscode=0.20261117.7`, published
2026-11-17; it ran VS Code `1.146.0-insider`) and `claude-code` (`claude-code=v0.33.1794879102`,
resolved but not run). The ledger records `agent`, `agent_package` and, for VS Code, the asset
folder and its SHA-256; oracle lines carry no agent, and lines without one are Copilot CLI. Skills
need no adapter: the image copies them into `/app/.github/skills`, and VS Code listed them to the
model with their `SKILL.md` paths. **MCP deviates from the card:** `.vscode/mcp.json` is not written
into the image, because Copilot CLI may also read workspace MCP files and every MCP arm's image would
change (new task graph, re-gates, possible double registration). Instead `gen-tasks.mjs
agent-assets` writes one asset folder with and one without the Aspire server, from the same server
definition as `task.toml`, and `submit.sh` passes the one matching the task; VS Code registers the
server at user scope, the scope Copilot CLI also reports, and all 15 tools appeared. The assets also
auto-approve tools (no prompt blocked any trial) and enable agent skills, and they keep the
evaluation-agent keys the run requires. Task emission is byte-identical,
so no re-pin was needed.

**Check (`t04-check`, `slow-sql`/`aspire-lean`/luna, tasks `0dfaf98f`):** `2026111829843826`,
`2026111829929810`, `2026111830028882`, all reward 1, `aspire-diagnose` loaded in each (a file read
of its `SKILL.md`), no MCP (the arm has none), `aspire describe` and `aspire otel traces` used 3 to 4
times each, no harness-path access. Next to Copilot CLI's `t01b` cell (n = 6):

| Harness | Pass | Agent s | Loop s | Loop s − transport wait | Input tokens | Cost | Tools | Chars read (content) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Copilot CLI (`t01b`) | 6/6 | 112 | 108 | 108 | 383k | $0.012 | 30.5 | 79k |
| VS Code (`t04-check`) | 3/3 | 373 | 329 | 142 | 482k | $0.014 | 31 | 92k |

Probe round `t04-probe` (not part of the check): one `aspire-skills-mcp` trial, reward 1,
`aspire-monitoring` loaded, 7 MCP calls (`list_resources` 2, `list_console_logs` 2, `list_traces`,
`list_structured_logs`, `list_apphosts`), 1.45 M tokens, $0.038; and one `aspire-lean` trial that never
started (`2026111828361612`: the harness's dependency install could not reach the Ubuntu archive;
an infrastructure failure, kept in `trials.jsonl`).

**Which record is complete.** The run's trajectory file, and Harbor's token count read from it,
held only the agent's last session: in the MCP probe a short subagent session that ran one
`dotnet build` (4,328 tokens, against 1.45 M for the whole run). The Copilot Chat extension's
OpenTelemetry span store, which the run also returns, held every session, model call and tool call
of all five VS Code trials; `collect.analyze_vscode` reads it.

**How each field is derived:** skill loads are file reads of `.github/skills/<name>/SKILL.md`; MCP
calls are renamed `aspire-<tool>` as Copilot CLI spells them; `aspire_cli` counts `aspire` commands
in terminal tools (also inside a subagent); phase markers use the tool call's end (root cause seen)
and start (first fix), relative to the main session's start; tokens and cost are summed over every
model call, cost as Copilot CLI's own records compute it (cost per input token agrees with the
Copilot rows of the same cell); `model_service_5xx` counts model calls
that failed with a 5xx (none occurred). Fields new on every row: `agent`, `agent_package`, `task`,
`agent_loop_seconds` (first to last event) and `tool_result_content_chars` (result content only;
Copilot's `tool_result_chars` also counts its `detailedContent`, roughly twice the content); VS Code
rows add `agent_version`, `subagent_sessions`, `transport_fallbacks`, `transport_wait_seconds` and
`usage_source`. A `vscode` row has every key a Copilot CLI row has (checked by key-set diff); the
results files keep harnesses in separate cells. The generic ATIF reader (used for `claude-code`)
was validated on 30 Copilot CLI trials that carry both formats: tool counts, MCP calls, skills,
`aspire` commands, harness-path access and models agree on all 30; phase times agree within about
2 s; `tool_calls_to_root_cause_seen` on 27 of 30 (the rest order a parallel batch differently).

**Fields that differ by definition, not derived the same way.** (1) `agent_seconds` is Harbor's
`agent_execution`, which for VS Code includes 43 to 55 s of VS Code launch and shutdown (4.4 s
median for Copilot CLI); compare harnesses on `agent_loop_seconds`. (2) Every VS Code trial lost
186.5 s (three times about 62 s) at the start: Copilot Chat first tries each model request over a
WebSocket, the attempt fails after about 62 s, the request then succeeds over HTTP, and after three
failures the extension stops trying. Why the WebSocket fails was not determined.
`transport_wait_seconds` measures the idle time from the extension log; phase times include it. No
setting that turns the WebSocket off was found. T1.9 must either find one or subtract the wait,
because a constant 186 s pulls every VS Code ratio to `raw` towards 1. (3) VS Code can hand terminal
work to a built-in subagent that runs on `gpt-5.6-luna`, not the requested model (the MCP probe, 4
subagent sessions, 10 calls; none in the three check trials), and every trial made 3 `gpt-4o-mini`
utility calls; `models_called` lists them and their tokens count. That is the product default, so it
belongs to the VS Code arm, but a VS Code "luna" cell is not luna alone. (4) The model-service wait
after a 5xx cannot be split from ordinary latency the way Copilot CLI's retry events allow; it is the
failed call plus the gap to the next one. (5) Not derived: `copilot_cli` is empty on VS Code rows
(`agent_version` carries the harness package and the VS Code build instead), and the Copilot Chat
extension's version was not found in the artifacts. (6) `claude-code` is pinned and routed to the
generic ATIF reader, but no trial ran it: neither that reader on its output nor Harbor's delivery of
`task.toml`'s MCP server to it is verified. (7) `comparison.md`, `stats.md` and `series.md` still use
`agent_seconds` for every harness; nothing yet subtracts the transport wait.

**Cost.** $0.04 (check) + $0.04 (probes); the gates are model-free.

---

## 5. Phase 1: confirm what is already measured

These have numbers at n = 3 to 12 on the old pins. Each gets the n it lacks, on the new
baseline, with its guard cells, and a verdict.

### T1.1 `aspire-diagnose` ship gate

| | |
|---|---|
| Measured so far | vs shipped: −11% to −67% time in 9/9 cells; `slow-redis` luna 0/6 → 5/6; selected 162/162 ([REPORT §7.1](REPORT.md#71-microsoftaspire-skills)) |
| Remaining | T0.2 is done (gate open on `heldout-cache`, after one step-1 revision that T0.2's silent fault showed was a stack-neutral failure). The ship-gate models (`gpt-6.2-sol`, `claude-opus-5.5`) on the held-out fault (now `heldout-cache`; the two `t02` faults are in-sample for the revised skill), `raw` and `aspire-lean`, n = 3 (12 trials ≈ $2.20 at the card's rate; terra-priced trials on this app cost about twice that) |
| Decision rule | Ship if T0.2 passes its rule. Revise step 3 only; steps 1 and 2 are frozen unless T0.2 shows a stack-neutral failure |
| Issue draft | [skills-add-aspire-diagnose.md](../upstream-issues/skills-add-aspire-diagnose.md) |
| Results | 11-09 pins: done. v0.0.6 + held-out: **ship** (2026-11-18, round `t11`, direction-finding n = 3): on `heldout-cache` `aspire-lean` ÷ `raw` 0.67× (`gpt-6.2-sol`) and 0.95× (`claude-opus-5.5`), every cell 3/3, no step-3 integration-line gap; [T1.1 results](#t11-results). Cost $4.31 |

#### T1.1 decision rule, as computed (written 2026-11-18, before round `t11` returned any trial)

- **Cells.** Round `t11`, `heldout-cache` (log-visible, the T0.2 gate fault) × `raw`, `aspire-lean` ×
  `gpt-6.2-sol`, `claude-opus-5.5` × n = 3, tasks `1479041` (the revised step 1, as in `t02-heldout3`).
  **Direction-finding** (PLAN §3): the exact Mann-Whitney floor at 3 vs 3 is p = 0.10, so p decides nothing.
- **Within +20 %**, per model, as T0.2 computed it: median agent seconds of `aspire-lean` ÷ `raw` over
  every graded trial ≤ 1.20, **and** `aspire-lean` passes no more than one trial fewer than `raw`.
- **Integration-line gap (step 3)**: in at least 2 of the 6 `aspire-lean` trials, after telemetry has
  named the statement, the agent spends 3 or more tool calls failing to reach SQL Server inside its
  container (a `psql`/Postgres line applied to SQL Server, `sqlcmd` not found, credentials hunted), or
  says the skill's dependency lines do not fit. Read from the trajectories, not from per-trial numbers.
- **Verdict.** The card's rule is "ship if T0.2 passes its rule", and T0.2 passed on `heldout-cache`.
  `ship` if both strong models are within +20 % and no step-3 gap shows. `revise` (step 3 only) if the gap
  shows: a proposal for the step-3 lines is written here and the skill is **not** edited in this lane.
  If a model misses +20 % with no step-3 cause, steps 1 and 2 stay frozen, the verdict is `no verdict`
  at n = 3, and an n = 6 follow-up on that model is named.
- **Infrastructure.** A trial that fails before the agent starts (image build), or times out or crashes
  with model-service 5xx, is re-run once in `t11-topup`; nothing else is re-run.

#### T1.1 results

**Verdict: `ship`** by the card's rule. T0.2 passed its rule on `heldout-cache`, and the strong models
confirm it: `aspire-lean` is within +20 % of `raw` on both, and no trial showed a step-3 gap.
- `gpt-6.2-sol`: 110 s against 165 s, 0.67× (p = 0.10, the floor at 3 vs 3).
- `claude-opus-5.5`: 96 s against 101 s, 0.95× (p = 1.0).
- Every cell 3/3, and every check (fast, root cause, functional) passed in all 12 trials.

These are three-trial cells, labelled **direction-finding** (PLAN §3). They can confirm a direction and
cannot carry a verdict alone; the verdict carries T0.2's n = 6 gate.

**Round health.** Round `t11`, tasks `1479041` (the revised step 1), Copilot CLI 1.0.99. 12 of 12
trials graded on the first pass: no top-up, no timeout, no crash, no model-service 5xx, no harness-path
access.

**`t11`** (n = 3 per cell; time = agent seconds, median over all graded trials; p = exact Mann-Whitney
against raw):

| Model | Arm | Time | Time ÷ raw | Tokens ÷ raw | Pass | Skill | $/trial | Run IDs |
|---|---|---:|---:|---:|---|---|---:|---|
| `gpt-6.2-sol` | raw | 165 s | — | — | 3/3 | — | 0.287 | `2026111875156300`, `…157656`, `…159220` |
| `gpt-6.2-sol` | **aspire-lean** | 110 s | **0.67×** (p=0.10) | 1.55× | 3/3 | `aspire-diagnose` 3/3 (and `aspire-orchestration` 3/3) | 0.416 | `2026111875164974`, `…166344`, `…168976` |
| `claude-opus-5.5` | raw | 101 s | — | — | 3/3 | — | 0.357 | `2026111875176636`, `…178386`, `…179550` |
| `claude-opus-5.5` | **aspire-lean** | 96 s | **0.95×** (p=1.0) | 1.26× | 3/3 | `aspire-diagnose` 3/3 | 0.375 | `2026111875184416`, `…186318`, `…187272` |

**Step 3 on SQL Server: no integration-line gap.** The skill's step-3 lines are PostgreSQL and Redis
only. All six `aspire-lean` agents still reached SQL Server inside its container on their own, with
`docker exec <container> … /opt/mssql-tools18/bin/sqlcmd -C …` and `$MSSQL_SA_PASSWORD`. They found the
container through `aspire describe sql --format Json` (step 3's own line), `docker ps`, or the
container name. No trial tried `psql`. The most any trial spent was two calls: one
`container.id` grep that matched nothing followed by `docker ps` (`2026111875184416`), and one
`docker exec` without `-i` that it re-ran with it (`2026111875168976`). That is under the pre-registered
threshold of three failed calls, so no step-3 revision is proposed. Unlike luna and terra in `t02`, a
strong model does not need an integration line to reach SQL Server.

**What the agents did** (read from the trajectories, all 12 trials):
- **Telemetry first, then the source.** Every `aspire-lean` trial loaded `aspire-diagnose` at its first
  or second call and ran `aspire otel traces --search "duration:>500"` before opening `Program.cs`.
  Raw agents opened `Program.cs` at their third to fifth call, and read EF Core's ranking line from
  `api.log` (raw "root cause seen" 5–10 s, `aspire-lean` 13–18 s). Every trial then fixed the
  per-shopper key in `Program.cs`.
- **No index first** in any `aspire-lean` trial, against luna `aspire-lean` 5/6 in `t02-heldout3`. One raw
  Opus trial created an index on `Orders` before fixing the key (`2026111875176636`). The three sol
  `aspire-lean` "index" matches are searches for the text `CREATE INDEX`, not statements.
- **Sol's gain is again the restart** (from the step timestamps): the median time to the first
  `Program.cs` edit is 55 s for raw and 44 s for `aspire-lean`, and the time from that edit to the end is
  about 110 s against 66 s. Raw sol agents restarted the API by hand. For example,
  `2026111875157656` read `scripts/start.sh` and `launch.mjs`, exported the connection string and spawned
  the process itself.
  `aspire-lean` sol agents ran `aspire resource api rebuild` (3/3). Opus restarted with `aspire resource
  api restart` (3/3) and raw Opus with the start script. Both took about 30 s to the first edit and
  about 65 s after it, so the two arms are level. The one slow Opus `aspire-lean` trial
  (`2026111875184416`, 170 s) built and verified twice.

**Cost.** $4.31 against the card's $2.20: Opus $0.36 (raw) and $0.38 (`aspire-lean`) per trial, sol
$0.29 and $0.42. `aspire-lean` reads 1.3–1.6× raw's input tokens on this app, because the trace JSON is
larger than the log line.

**Open items.**
1. The verdict rests on T0.2's gate; these cells are n = 3. If a strong-model verdict is wanted on its
   own, an n = 6 top-up of the four cells (12 trials, about $4.50) is the step.
2. Step 3 still names only PostgreSQL and Redis. Strong models did not need more, and luna and terra in
   `t02` also reached SQL Server unaided, so the gap that would justify a revision has not appeared on any model.

### T1.2 Monitoring trigger narrowed, in isolation

| | |
|---|---|
| Measured so far | Only as part of `lean`; D01 on 13.6 saw 81.5 s vs 94.1 s at n = 1 |
| Change | Arm `aspire-skills-mon`: v0.0.6 bundle with only `aspire-monitoring`'s description replaced; router kept |
| Cells | `slow-sql`, `read-only`, `slow-redis` × luna, terra × 6, against `aspire-skills` (v0.0.6) |
| Decision rule | Ship if time improves ≥ 15% on luna with p < 0.05 in two of three scenarios **or** selection of `aspire-monitoring` on diagnosis prompts drops below 1 in 3 with no pass-rate loss. Otherwise fold it into the router card: the trigger alone is not the lever |
| Trials / cost | 3 × 2 × 2 × 6 = 72 ≈ $2.90 |
| Results | Done 2026-11-18: [T1.2 results](#t12-results), round `t12`. **Verdict `drop`** (standalone): no luna time gain (0.95× to 1.34×, no p < 0.05) and `aspire-monitoring` still loaded 6/18 (luna) and 18/18 (terra), half of terra's through the router |

#### T1.2 decision rule, as computed (written 2026-11-18, before any `t12` trial)

- **Round `t12`**, Copilot CLI, tasks from the 2026-11-18 skills-lane re-pin (below, "T3.9 and T3.8 task graph"). Arms `aspire-skills-mon` (new: `compose.sh mon` = `current` with `lean-overrides/aspire-monitoring/SKILL.md`, i.e. only the frontmatter description replaced and its `FOR SINGLE OPERATIONS` line dropped; the router stays) and `aspire-skills` (v0.0.6, no MCP), both run fresh in this round: `t01b` has no `aspire-skills` cell without MCP (it ran `aspire-skills-mcp`), so nothing can be reused, and the card names the MCP-free arm. `slow-redis/aspire-skills` did not exist and is added by the re-pin.
- The override's description says "use aspire-diagnose" for first-line diagnosis, a skill this arm does not have. It is the measured, proposed text (issue draft `skills-narrow-aspire-monitoring.md`), so it is used verbatim; the dangling pointer is part of what is measured.
- **Time clause:** on luna, per scenario, median agent seconds of `aspire-skills-mon` ≤ 0.85 × `aspire-skills` and exact two-sided Mann-Whitney p < 0.05 (`stats.py`, every graded trial). Holds in ≥ 2 of the 3 scenarios → ship.
- **Selection clause:** `aspire-monitoring` loaded at any point (`skills_loaded`) in < 1/3 of `aspire-skills-mon` trials over the three scenarios (≤ 5 of 18), on luna and on terra, **and** no pass-rate loss: in no cell is `aspire-skills-mon` more than one trial below `aspire-skills`, and its total is not lower. Holds → ship.
- Neither clause → `drop` as a standalone change ("the trigger alone is not the lever"; it stays part of the lean set and the router card).
- No `raw` cell in `t12`: the rule compares two Aspire arms of the same round; `series.py` will flag the run `no-raw`. Infrastructure failures (900 s limit, crash with model-service 5xx, image build failure) are re-run once; any other failure counts.

#### T1.2 results

**Verdict: `drop`** as a standalone change (neither clause of the rule holds; the narrowed description stays part of the lean set and of the router card). Round `t12`, 72 trials, 2026-11-18, tasks `705f197` (suite `c28f654`) for the new arm and `slow-redis/aspire-skills`, the unchanged tasks `1479041` for `aspire-skills` `slow-sql` and `read-only`; Copilot CLI 1.0.99; no timeout, crash, image failure or model-service 5xx. The table compares the two arms within `t12` (6 vs 6); [stats.md](results/stats.md) pools every round of the pin. Oracle gates `gate-p1s` (`slow-sql` `2026111876615338`, `read-only` `…617558`, `slow-redis` `…619868` for `aspire-skills-mon`; `slow-redis/aspire-skills` `…631520`), all reward 1. Every run ID: `results/ledger.jsonl`, `round: t12`.

| Scenario | Model | Arm | Pass | Median s | Ratio | p (time) | Median tokens | Ratio | p (tokens) | Run IDs |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
| slow-sql | 6-luna | `aspire-skills` | 6/6 | 220 | | | 709k | | | `2026111877306520`–`…309802` |
| | | `aspire-skills-mon` | 6/6 | 295 | 1.34× | 0.093 | 982k | 1.39× | 0.485 | `2026111877299110`–`…302398` |
| slow-sql | 6.1-terra | `aspire-skills` | 6/6 | 104 | | | 422k | | | `2026111877351112`–`…354504` |
| | | `aspire-skills-mon` | 6/6 | 99 | 0.95× | 0.699 | 465k | 1.10× | 0.699 | `2026111877343708`–`…347060` |
| read-only | 6-luna | `aspire-skills` | 6/6 | 259 | | | 947k | | | `2026111877321384`–`…324568` |
| | | `aspire-skills-mon` | 4/6 | 246 | 0.95× | 0.699 | 778k | 0.82× | 0.394 | `2026111877313948`–`…317220` |
| read-only | 6.1-terra | `aspire-skills` | 6/6 | 102 | | | 373k | | | `2026111877365992`–`…369170` |
| | | `aspire-skills-mon` | 6/6 | 94 | 0.92× | 0.485 | 372k | 1.00× | 0.818 | `2026111877358532`–`…362062` |
| slow-redis | 6-luna | `aspire-skills` | 0/6 | 215 | | | 784k | | | `2026111877336306`–`…339588` |
| | | `aspire-skills-mon` | 0/6 | 205 | 0.96× | 1.000 | 591k | 0.75× | 0.818 | `2026111877328860`–`…332224` |
| slow-redis | 6.1-terra | `aspire-skills` | 6/6 | 235 | | | 767k | | | `2026111877380412`–`…383668` |
| | | `aspire-skills-mon` | 6/6 | 190 | 0.81× | 0.180 | 711k | 0.93× | 0.818 | `2026111877373162`–`…376472` |

**By the rule.** Time clause: luna ratios 1.34× (`slow-sql`, p = 0.093), 0.95× (`read-only`, p = 0.70), 0.96× (`slow-redis`, p = 1.0); none at ≤ 0.85× with p < 0.05, so 0 of 3. Selection clause: `aspire-monitoring` loaded in 6 of 18 luna `aspire-skills-mon` trials (the rule needs ≤ 5; the shipped set: 6 of 18) and 18 of 18 terra (shipped: 18 of 18), and luna `read-only` lost two trials (4/6 against 6/6), which the clause also forbids. Neither clause → `drop`. Pooled with the pin's other `aspire-skills` rounds (21 trials), luna `slow-sql` mon is 1.61× (p = 0.025): slower, not faster, so pooling only strengthens the verdict.

**Why, from the trajectories.**

- **The router puts the narrowed skill back.** Terra loaded `aspire-monitoring` in 18 of 18 trials on both arms. With the narrowed description, 9 of them loaded it directly anyway (its new "DO NOT USE FOR: finding why a running local app is slow…" line names `aspire-diagnose`, which this arm does not have, so no other skill claims the job), and the other 9 first loaded the router, whose table still sends "something's wrong" to `aspire-monitoring` (`aspire > aspire-monitoring` 8, plus orchestration 1). On the shipped set terra never loaded the router (18 of 18 straight to monitoring). The trigger change therefore moved terra onto a longer path to the same skill, and time did not change (0.81× to 0.95×, no p below 0.18).
- **Luna mostly loads no skill.** 11 of 18 `aspire-skills-mon` and 12 of 18 `aspire-skills` luna trials loaded none, so a description change can reach at most a third of luna trials. Luna `slow-sql` mon's higher median comes from the spread, not a different route: 4 of 6 trials loaded nothing, and the slowest (`2026111877300476`, 716 s) loaded router then monitoring and put the trigger on screen after 454 s; without it the cells overlap (192–345 s against 162–268 s).
- **The two luna `read-only` failures** (`2026111877316616`, `…317220`) made the application work with a per-session override (`PGOPTIONS`, a patch to `Program.cs`) instead of resetting the database default, the failure mode T0.1 already recorded for luna on v0.0.6. The same arm without the change failed the same way in `t13` (4/6), and one of the two failing trials loaded no skill. Not attributable to the description at n = 6.

**Cost.** $4.49 model cost against the card's $2.90 (luna $0.023 and terra $0.102 per trial; terra `slow-redis` alone $1.65).

### T1.3 Router removal, in isolation

| | |
|---|---|
| Measured so far | `aspire-plus` (router + new skill) vs `aspire-lean` (no router + new skill): luna selection 4/6 → 12/12 |
| Change | Arm `aspire-skills-norouter`: v0.0.6 bundle minus the `aspire` skill, nothing added |
| Cells | `slow-sql`, `read-only`, `cold-start` × luna, terra × 6, against `aspire-skills`; guard `slow-redis` luna × 6 on both arms |
| Decision rule | Confirms the router's cost if luna time drops ≥ 20% on the diagnosis scenarios. Confirms F21 if `cold-start` luna regresses ≥ 20%, which keeps `aspire-start` a required companion. Either way the verdict is "remove, with an owner per job" |
| Guard | The router's guardrail role: run T3.8's guardrail scenario in the same round (T3.8's fixture is therefore a prerequisite of this card) |
| Trials / cost | 3 × 2 × 2 × 6 = 72 + 12 guard = 84 ≈ $3.10 |
| Issue draft | [skills-remove-router-add-aspire-start.md](../upstream-issues/skills-remove-router-add-aspire-start.md) |
| Results | Done 2026-11-18: [T1.3 results](#t13-results), round `t13`. **Verdict `ship`**: guards `slow-redis` and `stuck-db` unchanged without the router. Router cost confirmed by the rule (same round: luna 0.50× `slow-sql`, 0.67× `read-only`); across the pin's rounds it holds on `read-only` (0.61×, p = 0.032) but not on `slow-sql` (0.74×, p = 0.37), where the shipped set's own luna median moves 147–271 s between rounds. `cold-start` 1.07× same round (F21 not confirmed), 1.31× against T1.6's round: not settled |

#### T1.3 decision rule, as computed (written 2026-11-18, before any `t13` trial)

- **Round `t13`**, Copilot CLI, same task graph as T1.2. Arms `aspire-skills-norouter` (new: `compose.sh norouter` = `current` minus the `aspire` skill, nothing added; also T3.8's `bundle-minus`) and `aspire-skills` (v0.0.6, no MCP), both fresh in this round. Cells `slow-sql`, `read-only`, `cold-start` × luna, terra × 6; guard `slow-redis` luna × 6 on both arms; guardrail `stuck-db` (T3.8) luna × 6 on both arms. No `raw` cell (as T1.2).
- **Router cost confirmed** if luna median agent seconds `aspire-skills-norouter` ÷ `aspire-skills` ≤ 0.80 in both `slow-sql` and `read-only` (p reported, not required; the card sets none). One of the two: "partly confirmed".
- **F21 confirmed** if luna `cold-start` ratio ≥ 1.20 (then `aspire-start` stays a required companion of the removal).
- **Verdict:** `ship` (remove the router, with an owner per job) if the guards hold: `slow-redis` luna and `stuck-db` luna passes of `aspire-skills-norouter` are each at least `aspire-skills`' minus one. A guard that fails → `revise`: the job it shows (the guardrail, or the dependency step) needs an owner outside the router before removal.

#### T1.3 results

**Verdict: `ship`** (remove the router, with an owner per job): the router's cost is confirmed on luna, the cold-start regression F21 predicted did not appear, and both guards hold. Round `t13`, 96 trials, 2026-11-18, tasks `705f197` (suite `c28f654`), Copilot CLI 1.0.99; no timeout, crash, image failure or model-service 5xx. The new arm's tasks are `705f197`; the `aspire-skills` `slow-sql`, `read-only` and `cold-start` tasks are the unchanged ones of tasks `1479041` (suite `305a8ed`), as in every earlier round of this pin. The table compares the two arms within `t13` (6 vs 6); [stats.md](results/stats.md) pools every round of the pin, so its lines for these pairs differ (below). Oracle gates `gate-p1s` for `aspire-skills-norouter`: `slow-sql` `2026111876622120`, `read-only` `…624462`, `cold-start` `…626878`, `slow-redis` `…629200`, `stuck-db` `…609480`, all reward 1. Every run ID: `results/ledger.jsonl`, `round: t13`.

| Scenario | Model | Arm | Pass | Median s | Ratio | p (time) | Median tokens | Ratio | p (tokens) | Run IDs |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
| slow-sql | 6-luna | `aspire-skills` | 6/6 | 271 | | | 1128k | | | `2026111877395496`–`…398738` |
| | | `aspire-skills-norouter` | 6/6 | 136 | 0.50× | 0.065 | 566k | 0.50× | 0.041 | `2026111877388214`–`…391446` |
| slow-sql | 6.1-terra | `aspire-skills` | 6/6 | 107 | | | 476k | | | `2026111877440374`–`…443482` |
| | | `aspire-skills-norouter` | 6/6 | 97 | 0.90× | 0.132 | 375k | 0.79× | 0.240 | `2026111877432618`–`…435912` |
| read-only | 6-luna | `aspire-skills` | 4/6 | 234 | | | 1022k | | | `2026111877410542`–`…413884` |
| | | `aspire-skills-norouter` | 4/6 | 157 | 0.67× | 0.240 | 660k | 0.65× | 0.041 | `2026111877402958`–`…406404` |
| read-only | 6.1-terra | `aspire-skills` | 6/6 | 118 | | | 423k | | | `2026111877455780`–`…459098` |
| | | `aspire-skills-norouter` | 6/6 | 89 | 0.75× | 0.132 | 350k | 0.83× | 0.485 | `2026111877448064`–`…451426` |
| cold-start | 6-luna | `aspire-skills` | 6/6 | 73 | | | 170k | | | `2026111877425276`–`…428636` |
| | | `aspire-skills-norouter` | 6/6 | 78 | 1.07× | 0.485 | 259k | 1.53× | 0.818 | `2026111877417974`–`…421168` |
| cold-start | 6.1-terra | `aspire-skills` | 6/6 | 59 | | | 104k | | | `2026111877470414`–`…473580` |
| | | `aspire-skills-norouter` | 6/6 | 58 | 0.99× | 0.561 | 103k | 0.99× | 0.394 | `2026111877463184`–`…466484` |
| slow-redis | 6-luna | `aspire-skills` | 0/6 | 222 | | | 819k | | | `2026111877492546`–`…495718` |
| | | `aspire-skills-norouter` | 0/6 | 202 | 0.91× | 0.485 | 966k | 1.18× | 0.818 | `2026111877477636`–`…480876` |
| stuck-db | 6-luna | `aspire-skills` | 6/6 | 62 | | | 209k | | | `2026111877499888`–`…503076` |
| | | `aspire-skills-norouter` | 6/6 | 56 | 0.90× | 0.485 | 202k | 0.97× | 1.000 | `2026111877485248`–`…488468` |

**By the rule.** Router cost: luna `aspire-skills-norouter` ÷ `aspire-skills` 0.50× on `slow-sql` (p = 0.065; tokens 0.50×, p = 0.041) and 0.67× on `read-only` (p = 0.24; tokens 0.65×, p = 0.041), both ≤ 0.80 → **confirmed** by the rule as written (the card sets no p; neither time p is below 0.05). F21: luna `cold-start` 1.07× (78 s against 73 s, p = 0.49), below 1.20 → **not confirmed** by the rule. Guards: `slow-redis` luna 0/6 on both arms (the shipped set fails it with or without the router, as in T0.1); `stuck-db` luna 6/6 on both. Both hold → `ship`.

**Across rounds (read after the verdict; it does not change the word, it changes how far the two sub-conclusions reach).** The same `aspire-skills` task on luna has run in four rounds of this pin, and its median moves more than the effect: `slow-sql` 147 s (`t210`), 220 s (`t12`), 271 s (`t13`), plus 3 trials at 100–179 s (`t01b-plugin`); `cold-start` 59.5 s (`t16`) and 73.5 s (`t13`).
- `read-only`: against `t12`'s baseline 0.61×, against both rounds pooled (12 trials) 0.61×, p = 0.032 (tokens −30 %, p = 0.003). **The router's cost holds here.**
- `slow-sql`: against `t12` 0.62×, against `t210` 0.92×, against all 21 trials pooled 0.74×, p = 0.37 (input tokens −30 %, p = 0.16; the same-round token p of 0.041 does not survive pooling). `t13`'s baseline was the slowest of the four rounds. **Not established on `slow-sql`.**
- `cold-start`: against `t16`'s `aspire-skills` (T1.6, same tasks) the no-router arm is 1.31×, and against both rounds pooled (12 trials, [stats.md](results/stats.md)) +24 % (p = 0.10), over the 1.20 line; but the shipped set itself moved 1.24× between those two rounds, and T1.6's own same-round comparison of a router-free set (`aspire-lean`, 61 s) with the shipped set (60 s) was level. **F21 is not confirmed and not refuted at this n.** A same-round re-run at n = 12 would settle both open points.

**Why, from the trajectories.**

- **Diagnosis.** Without the router, luna `slow-sql` trials put the slow statement on screen sooner (median 53 s against 84 s), with fewer tool calls (38 against 63) and less read (104k against 167k characters of tool output). Part of that is skill choice: `aspire-monitoring` was loaded in 3 of 6 trials against 5 of 6, and in the no-router arm its loaders took 127–383 s against 105–138 s for the trials that loaded nothing (on the shipped set the one non-loader, 197 s, sat inside the loaders' 175–402 s). The router itself was loaded in none of the 12 `slow-sql` trials, so its cost is not its 21 KB body; but the no-skill trials were also faster than `t12`'s no-skill baseline trials (105–138 s against 162–268 s), so the full mechanism is not determinable from these cells. Terra moved the same way, less (0.90×, 0.75×; p 0.13).
- **Cold start.** Every luna and terra trial on both arms loaded `aspire-orchestration` (12 of 12 per model). With the router present, 3 of 6 luna trials loaded it first and then read less of orchestration's references (11k–17k characters against 28k–44k), but time was level. v0.0.6's orchestration skill now carries luna through a cold start on its own; the 11-09 regression (82 s) was measured on v0.0.5's. Within this round, removing the router did not need `aspire-start`; across rounds the question stays open (above), and T1.6 decided separately that `aspire-start` does not pay for itself.
- **`read-only` luna failures** (2 of 6 on both arms) are all the per-session-override route; `slow-redis` luna failed 6 of 6 on both arms the way every shipped-set luna `slow-redis` cell has: all 12 trials edited the service code and none stopped the exporter (4 ran a cache command); the verifier still measured 0.3 to 11.6 s per status or call.
- **Guardrail.** All 12 `stuck-db` luna trials restarted only the database (`aspire resource postgres restart` 10, `docker restart` 2) and passed; details in [T3.8 results](#t38-results).

**What "an owner per job" means after this round.** Diagnosis: `aspire-monitoring` today (or `aspire-diagnose`, T1.1); start/restart: `aspire-orchestration` (selected without the router in 12 of 12 `cold-start` and 15 of 18 `stuck-db` trials); the guardrails the router states (investigate before editing, never edit `.aspire/modules`, `aspire stop --force` is destructive): `aspire-orchestration`'s `safety-guardrails.md` already carries them, and T3.8 found no case where the router's copy changed an outcome.

**Cost.** $3.39 for 96 trials (luna $0.017, terra $0.067 per trial) against the card's $3.10 for 84; the 12 extra are the `stuck-db` guard this round added.

### T1.4 MCP compact telemetry at decision n

| | |
|---|---|
| Measured so far | −6% to −36% time in 8/8 cells at n = 3; with lean skills + both patches, `read-only` luna 3/3 ([REPORT §7.2](REPORT.md#72-dotnetaspire)) |
| Change | Patch 0001 rebased on current main |
| Arms | `aspire-mcp-compact` vs `aspire-mcp-src`; `aspire-lean-mcp-compact` vs `aspire-lean-mcp-src` |
| Cells | `slow-sql`, `read-only` × luna, terra × 6; **guard** `slow-redis` luna × 6 on both lean arms |
| Decision rule | Ship if time improves with p < 0.05 in the MCP-only cells on luna and the guard cell's pass rate is not below the lean CLI-only arm by more than one trial. If the guard fails, T2.8 (MCP dependency step) becomes a prerequisite of shipping |
| Trials / cost | 2 × 2 × 2 × 2 × 6 = 96 + 12 guard = 108 ≈ $4.10 |
| Issue draft | [aspire-mcp-compact-telemetry.md](../upstream-issues/aspire-mcp-compact-telemetry.md) |
| Results | 11-09 pins n = 3: done. **Decision n, 2026-11-18: `drop`** by the rule as computed: on luna the compact server is not significantly faster in either MCP-only cell (`slow-sql` −12 %, p = 0.73; `read-only` −10 %, p = 0.70, and 4/6 against 6/6); the guard holds (`slow-redis` luna, `aspire-lean-mcp-compact` 5/6 against the CLI-only `aspire-lean` 5/6, round `t14-guard`), so T2.8 is not a prerequisite. On terra the same pair is −29 % (p = 0.009) and −30 % (p = 0.002). Under Copilot CLI the unpatched results never reach the model whole: results over about 20 KB are saved to a file and shown as a 500-character preview ([F31](../FINDINGS.md#f31-copilot-cli-shows-a-500-character-preview-of-any-tool-result-over-about-20-kb)). [T1.4 results](#t14-results) below |

#### T1.4 decision rule, as computed (written 2026-11-18, before any `t14` result was read)

- **Round `t14`**, Copilot CLI, tasks `1479041` (suite `305a8ed`). Its own `raw` runs in the round (`slow-sql`, `read-only` × luna, terra; `slow-redis` luna): `t01b`'s raw ran on tasks `0dfaf98f` and `series.py` divides by the same run's raw. Between the two task graphs only the `aspire-diagnose` step-1 text changed (T0.2), which reaches `lean` arms only. The source arms were gated on `0dfaf98f` (`gate-t01-src`); their images differ at `1479041` by that skill text alone.
- **Ship clause:** `aspire-mcp-compact` vs `aspire-mcp-src` on luna, **both** `slow-sql` and `read-only`: median agent seconds lower and exact two-sided Mann-Whitney p < 0.05 (`stats.py`, every graded trial, pass or fail). One cell alone is "revise", neither is "drop". Lean-MCP and terra cells are reported, not decisive. A pass-rate loss of more than one trial in any cell is reported next to the verdict.
- **Guard clause:** `aspire-lean-mcp-compact` on `slow-redis` luna passes at least the lean CLI-only arm's count minus one. The CLI-only comparator is `aspire-lean` (official daily) in the same round, since no `slow-redis` task exists for `aspire-lean-src`. **Neither `slow-redis/aspire-lean-mcp-src` nor `slow-redis/aspire-lean-mcp-compact` exists as a task** (`gen-tasks.mjs` emits `slow-redis` only for `raw`, `aspire-cli`, `aspire-skills-mcp`, `aspire-lean`, `aspire-lean-mcp-all`); adding them is a re-pin, which belongs to the skills lane. Until they run, the guard is read on the proxy `aspire-lean-mcp-all` (patches 0001 + 0002, gated) and the verdict is conditional. Guard fails → T2.8 becomes a prerequisite of shipping.
- A trial that hits the 900 s limit or crashes with model-service 5xx is an infrastructure failure and is re-run once; otherwise it counts as a fail.


#### T1.4 results

**Verdict: `drop`, by the rule as computed** (ship clause not met on luna; guard met). The card defines
only "ship"; the mapping "one luna cell = revise, neither = drop" was added by this lane before the run
(2c299da). Terra was declared "reported, not decisive" in the same note, and it is the one model on which
the patch is clearly faster. The user may rule on that, as for T0.2; nothing was re-run.
**Ruling (user, 2026-11-18): drop stands.** The luna rule decides as pre-registered; the terra gain is
recorded, not acted on. The patch may return in Phase 2 under a card whose rule names terra.

**Rounds** (Copilot CLI 1.0.99, n = 6 per cell, 2026-11-18): `t14` (138 trials, tasks `1479041`),
`t14-guard` (24 trials: `raw` and `aspire-lean` on tasks `1479041`, `aspire-lean-mcp-src` and
`aspire-lean-mcp-compact` on tasks `705f197`, the skills lane's additive re-pin of suite `c28f654`, whose
diff from `305a8ed` adds `stuck-db` and selection branches to `bench.mjs` and new skill sets to
`compose.sh` and touches nothing on the `slow-redis` path or in the `lean` set), and `t14-topup` (4 raw
luna replacements, below). Gates: `gate-t01-src` (15/15, tasks `0dfaf98f`; the source images differ at
`1479041` by the `aspire-diagnose` step-1 text only) and, for the two new guard cells, the skills lane's
`gate-p1s` `2026111876633824` (src) and `2026111876636390` (compact), both reward 1. Patch 0001 applied and
built in every compact image (a graded trial implies it). 166 of 166 graded; no model-service 5xx in any trial.

**Cells** (time = agent seconds, median; ÷ raw = same round, scenario and model; MCP = median MCP calls
per trial):

| Round | Scenario | Model | Arm | Pass | Time | ÷ raw | Input tokens | MCP | $/trial | Run IDs |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|
| t14 | slow-sql | luna | raw | 5/6 | 120 | 1.00× | 474k | 0 | 0.015 | `2026111875726166`…`729198` |
| t14 | slow-sql | luna | aspire-mcp-src | 6/6 | 171 | 1.43× | 769k | 8 | 0.021 | `2026111875733474`…`736724` |
| t14 | slow-sql | luna | aspire-mcp-compact | 6/6 | 151 | 1.26× | 608k | 10 | 0.020 | `2026111875741130`…`744260` |
| t14 | slow-sql | luna | aspire-lean-mcp-src | 6/6 | 94 | 0.78× | 382k | 4 | 0.012 | `2026111875748426`…`751612` |
| t14 | slow-sql | luna | aspire-lean-mcp-compact | 6/6 | 122 | 1.02× | 474k | 8 | 0.015 | `2026111875755882`…`759016` |
| t14 | slow-sql | terra | raw | 6/6 | 63 | 1.00× | 187k | 0 | 0.060 | `2026111875763128`…`766252` |
| t14 | slow-sql | terra | aspire-mcp-src | 6/6 | 94 | 1.50× | 414k | 8.5 | 0.087 | `2026111875770380`…`773618` |
| t14 | slow-sql | terra | aspire-mcp-compact | 6/6 | 67 | 1.06× | 288k | 6 | 0.080 | `2026111875777688`…`780970` |
| t14 | slow-sql | terra | aspire-lean-mcp-src | 6/6 | 69 | 1.09× | 240k | 3 | 0.062 | `2026111875785038`…`788040` |
| t14 | slow-sql | terra | aspire-lean-mcp-compact | 6/6 | 67 | 1.07× | 260k | 6 | 0.067 | `2026111875792246`…`795422` |
| t14 | read-only | luna | raw | 6/6 | 86 | 1.00× | 424k | 0 | 0.015 | `2026111875799560`, `…800226`, `…801566`, `…802198` + `t14-topup` `2026111881321304`, `…321950` |
| t14 | read-only | luna | aspire-mcp-src | 6/6 | 134 | 1.56× | 788k | 12.5 | 0.020 | `2026111875806994`…`810614` |
| t14 | read-only | luna | aspire-mcp-compact | 4/6 | 120 | 1.40× | 785k | 13 | 0.020 | `2026111875814918`…`818134` |
| t14 | read-only | luna | aspire-lean-mcp-src | 6/6 | 101 | 1.17× | 490k | 7.5 | 0.014 | `2026111875822664`…`825984` |
| t14 | read-only | luna | aspire-lean-mcp-compact | 6/6 | 86 | 1.00× | 567k | 11 | 0.014 | `2026111875830150`…`833564` |
| t14 | read-only | terra | raw | 6/6 | 56 | 1.00× | 206k | 0 | 0.062 | `2026111875837652`…`841086` |
| t14 | read-only | terra | aspire-mcp-src | 6/6 | 80 | 1.44× | 472k | 11 | 0.086 | `2026111875845610`…`849158` |
| t14 | read-only | terra | aspire-mcp-compact | 6/6 | 56 | 1.01× | 356k | 10 | 0.082 | `2026111875861780`…`865176` |
| t14 | read-only | terra | aspire-lean-mcp-src | 6/6 | 55 | 1.00× | 235k | 4 | 0.059 | `2026111875870086`…`873950` |
| t14 | read-only | terra | aspire-lean-mcp-compact | 6/6 | 48 | 0.86× | 291k | 10 | 0.068 | `2026111875894820`…`898206` |
| t14 | slow-redis | luna | raw | 2/6 | 259 | 1.00× | 528k | 0 | 0.020 | `2026111875910064`…`913274` |
| t14 | slow-redis | luna | aspire-lean | 4/6 | 141 | 0.54× | 583k | 0 | 0.015 | `2026111875918196`…`921544` |
| t14 | slow-redis | luna | aspire-lean-mcp-all (proxy) | 6/6 | 179 | 0.69× | 715k | 5 | 0.023 | `2026111875925940`…`929318` |
| t14-guard | slow-redis | luna | raw | 0/6 | 280 | 1.00× | 684k | 0 | 0.022 | `2026111878362042`, `…366634`, `…369584`, `…372518` + `t14-topup` `2026111881325068`, `…325764` |
| t14-guard | slow-redis | luna | aspire-lean | 5/6 | 137 | 0.49× | 461k | 0 | 0.014 | `2026111878387572`…`406340` |
| t14-guard | slow-redis | luna | aspire-lean-mcp-src | 4/6 | 191 | 0.68× | 668k | 3.5 | 0.017 | `2026111878423676`…`432864` |
| t14-guard | slow-redis | luna | aspire-lean-mcp-compact | 5/6 | 173 | 0.62× | 755k | 12 | 0.020 | `2026111878448694`…`460428` |

**Patch against its control** (exact two-sided Mann-Whitney, n = 6 vs 6, `stats.py`'s test):

| Scenario | Model | Pair | Time | p | Input tokens | p | Pass |
|---|---|---|---:|---:|---:|---:|---|
| slow-sql | luna | `aspire-mcp-compact` vs `-src` | −12 % | 0.73 | −21 % | 0.24 | 6/6 vs 6/6 |
| read-only | luna | `aspire-mcp-compact` vs `-src` | −10 % | 0.70 | −0 % | 0.70 | **4/6** vs 6/6 |
| slow-sql | terra | `aspire-mcp-compact` vs `-src` | **−29 %** | 0.009 | −30 % | 0.009 | 6/6 vs 6/6 |
| read-only | terra | `aspire-mcp-compact` vs `-src` | **−30 %** | 0.002 | −24 % | 0.24 | 6/6 vs 6/6 |
| slow-sql | luna | `aspire-lean-mcp-compact` vs `-src` | +30 % | 0.18 | +24 % | 0.18 | 6/6 vs 6/6 |
| read-only | luna | `aspire-lean-mcp-compact` vs `-src` | −14 % | 0.13 | +16 % | 0.49 | 6/6 vs 6/6 |
| slow-sql | terra | `aspire-lean-mcp-compact` vs `-src` | −2 % | 0.49 | +8 % | 0.31 | 6/6 vs 6/6 |
| read-only | terra | `aspire-lean-mcp-compact` vs `-src` | −14 % | 0.015 | **+24 %** | 0.026 | 6/6 vs 6/6 (cost +13 %, p = 0.026) |
| slow-redis | luna | `aspire-lean-mcp-compact` vs `-src` (`t14-guard`) | −9 % | 0.94 | +13 % | 0.39 | 5/6 vs 4/6 |

**Guard.** `aspire-lean-mcp-compact` 5/6 against the CLI-only `aspire-lean` 5/6 in the same round
(`t14-guard`): within one trial, so the guard holds and T2.8 does not become a prerequisite. The proxy in
`t14` agrees (`aspire-lean-mcp-all` 6/6 against `aspire-lean` 4/6). The 11-09 failure, agents that stay in
MCP and patch code, did not recur: every compact guard trial also ran `redis-cli` (4 to 16 times), and the
one failure (`2026111878454582`) patched the application without finding the exporter, as did every
failure on every lean arm (`aspire-lean` `…388476`; `-src` `…427444`, `…432864`). Every passing trial on
every lean arm read `SLOWLOG` or `CLIENT LIST`, and all but one (`aspire-lean` `…403694`) named the exporter;
the revised `aspire-diagnose` step 3 sends MCP agents to the cache the same way it sends CLI agents.

**Mechanism, read from the trajectories.**
1. **Under Copilot CLI the unpatched results never reach the model whole.** Copilot CLI saves any tool
   result over about 20 KB to a file and returns an 837-character notice with a 500-character preview
   (spilled results 20.3 to 70.7 KB, largest result kept 18.2 KB, in these rounds;
   [F31](../FINDINGS.md#f31-copilot-cli-shows-a-500-character-preview-of-any-tool-result-over-about-20-kb)). The
   unpatched `list_traces` (about 30 KB at every call, "Returned latest 21 traces. Earlier 118 traces not
   returned") and the large `list_structured_logs` calls are all spilled: 168 spills in the 54 src trials,
   followed by 125 `rg`/`view` reads of the spill files. The compact arms spilled 31 times (54 trials) with
   12 such reads. So what the patch saves under this harness is the follow-up file reads, not context.
2. **Compact results go into the context whole, so agents call them more.** A compact `list_traces` returns
   4.0k to 8.5k characters of content per call (mean per cell; `limit`, `search` and `traceId` drill-downs),
   against 837 characters of preview for the unpatched call. Agents made more `list_traces` calls (median 2 to
   6.5 per trial against 0.5 to 4) and read 14k to 28k characters of trace content per trial against 0.4k
   to 3.3k. On terra the fewer file reads and turns outweigh this (−29 % and −30 % time); on luna they do
   not (−10 % and −12 %, not significant).
3. **With lean skills the patch changes the route.** On `aspire-lean-mcp-src` the skill keeps agents on the
   CLI (median 5 to 6.5 `aspire` commands per trial, 3 to 7.5 MCP calls); on `aspire-lean-mcp-compact` MCP
   becomes the main route (1 to 1.5 `aspire` commands, 6 to 12 MCP calls), as on the 11-09 pin. That costs
   tokens (+8 % to +24 %, p = 0.026 on terra `read-only`) and, on luna `slow-sql`, time (+30 %, not
   significant).
4. **Luna `read-only` 4/6.** Both failures (`2026111875816204`, `…817488`) read SQLSTATE 25006 from the MCP
   logs, then patched `Program.cs` (a session-level workaround) and never ran `psql`; every passing compact
   trial and every src trial ran `psql` (2 to 11 times) and fixed the default at the database. That is the failure
   the shipped MCP arms showed on 11-09; whether the compact shape caused it here is not determinable at two
   trials.

**Against the 11-09 result** ("−6 % to −36 % time in 8/8 cells", n = 3): at n = 6 the MCP-only pair is
faster in 4/4 cells but significant only on terra; the lean pair is slower or level in two of four cells and
uses more tokens in three. REPORT §7.2 and the issue draft are updated accordingly.

**Timeouts, two readings.** Four raw luna trials reached the 900 s limit without any 5xx:
`2026111875800846`, `…802804` (`read-only`, `t14`), `2026111878368298`, `…373770` (`slow-redis`,
`t14-guard`). In each the agent went idle at 348 to 577 s (`assistant.idle` is the last event), after
restarting the raw app with `scripts/start.sh` from its shell, and Copilot CLI did not exit; two of the four
still graded 1. The rule as written counts a 900 s hit as an infrastructure failure, so the four carry an
`excluded` reason in the ledger and were re-run once (`t14-topup`): `read-only` 2/2, `slow-redis` 0/2. The
other reading (T0.1's: a timeout without 5xx is an agent result) gives raw `read-only` luna 5/6 and
`slow-redis` luna (`t14-guard`) 1/6 with 900 s in the medians. No ship or guard clause involves raw.

**Cost.** $6.05 recorded ($5.58 `t14`, $0.39 `t14-guard`, $0.08 `t14-topup`) against the card's $4.10;
terra trials cost $0.059 to $0.087.

### T1.5 CLI plain output when redirected

| | |
|---|---|
| Measured so far | −21% to −59% bytes read, −12% to +1% time, none significant at n = 3 |
| Decision | No further agent runs. Verdict: ship for the context it frees, claim no speed-up. Rebase on #22054 and re-measure the byte counts only (no model) |
| Issue draft | [aspire-cli-plain-output.md](../upstream-issues/aspire-cli-plain-output.md) |
| Results | **Ship** (for the context it frees; no speed-up claimed). Re-measured 2026-11-18 at pin `2026-11-17`, no model: [T1.5 results](#t15-results) below. Redirected `aspire describe` 5,282 → 1,221 bytes (−77 %) against the source control; `--format Json` unchanged (24,868 bytes, byte-identical across official, control and patched). Rebase not needed (patch 0002 applies to `30326eb8`; #22054's exit code is in the State cell, which 0002 does not touch) |

#### T1.5 results

**Build.** One local cell, `CLI_PATCH=cli-plain-output bash tools/local.sh up aspire lean slow-sql` (suite
`305a8ed`, the same `Dockerfile` the `aspire-lean-plain` arm builds remotely, arm64). The image keeps the
official daily at `/usr/local/aspire/aspire` (it starts the AppHost) and puts the patched build on `PATH`;
the unpatched control (`Dockerfile` stage `cli-source`, `CLI_PATCH=control`) was built separately and
copied into the same container. So all three CLIs read **one running AppHost** under live traffic, back to
back, from `/app`, stdout redirected to a file. Versions: `17.1.0-preview.1.26567.3+30326eb8…`,
`17.1.0-agentic.control+30326eb8…`, `17.1.0-agentic.cliplainoutput+30326eb8…`.

| Command (stdout, bytes) | official daily | source control | patched (0002) | patched vs control |
|---|---:|---:|---:|---:|
| `aspire describe` | 5,282 | 5,282 | 1,221 | −77 % |
| `aspire describe --format Json` | 24,868 | 24,868 | 24,868 | 0, byte-identical |
| `aspire otel traces -n 15 --search duration:>500` | 6,863 | 6,863 | 1,561 | −77 % |
| `aspire otel traces` | 31,258 | 31,258 | 12,280 | −61 % |
| `aspire otel spans -n 20` | 3,327 | 3,386 | 1,456 | −57 % |
| `aspire otel logs -n 20` | 3,916 | 3,916 | 3,916 | 0 |

- **Reproduces T0.1.** The official table is 5,282 bytes, as T0.1 recorded. T0.1's JSON figure, 24,902, is
  this run's 24,868 plus the 33-byte `Scanning for running AppHosts...` line: `describe --format Json`
  writes that line to stderr, the table form to stdout. Official and control output are byte-identical for
  both `describe` forms (`cmp`), so the source build adds nothing and the difference is the patch alone.
- **What the patch removes.** Borders and the per-resource dashboard link
  (`http://localhost:<dashboard>/?resource=…`), which on this daily wraps every row onto a third line
  because #22054 widened the State column. Every endpoint URL is kept (`http://…/`, `…/squares-management`,
  `tcp://`, `rediss://`). The patched table is 15 % larger than on the 11-09 pin (1,086 bytes) because of the
  exit-code text; it is still space-padded.
- **JSON is untouched.** 0002 only changes table rendering; the agent's JSON reads (`describe <resource>
  --format Json` in the lean skill's step 3, the 28 KB spill-and-grep loop T0.1 saw on `cold-start`) do not
  get smaller.

**Verdict: ship, for the context it frees, no speed-up claimed** (the card's decision; no agent run).
On the 11-09 pin the same patch cut characters read by −21 % to −59 % with time −12 % to +1 %, no cell
significant ([REPORT §7.2](REPORT.md#72-dotnetaspire)); on the new pin the table it trims is 24 % larger,
so the saving per `describe` is 4.1 KB instead of 3.2 KB. Evidence:
[evidence/agent-surface/2026-11-18/](evidence/agent-surface/2026-11-18/) (outputs, `measure.sh`, versions).

**Cost.** No model; one local build (about 6 min with cached layers).

### T1.6 `aspire-start` against v0.0.6 orchestration

| | |
|---|---|
| Measured so far | 82 s → 51 s on luna with the v0.0.5 orchestration skill as the fall-through |
| Change | Same `aspire-start`; v0.0.6 changed `aspire-orchestration` (31/11 lines, `detection.md` +47) |
| Cells | `cold-start` × luna, terra, `gpt-6.2-sol` × 6: `aspire-skills` (v0.0.6), `aspire-lean`, `aspire-lean-start`, `aspire-cli` |
| Decision rule | `aspire-start` stays if luna `aspire-lean` without it is still ≥ 20% slower than with it. If v0.0.6 orchestration closed the gap by itself, drop `aspire-start` from the proposal and say so |
| Trials / cost | 4 × 3 × 6 = 72 ≈ $4.80 |
| Results | **drop** (2026-11-18, round `t16`, 90 trials with a `raw` cell, every cell 6/6): luna `aspire-lean` 61 s without `aspire-start`, 53 s with it, a gap of 1.16× (p = 0.004), under the rule's 1.20, so v0.0.6 orchestration closed most of the 11-09 gap (1.61×). Terra 0.94×, sol 0.99×; [T1.6 results](#t16-results). Cost $5.36 |

#### T1.6 decision rule, as computed (written 2026-11-18, before round `t16` was submitted)

- **Cells.** Round `t16`, `cold-start` × luna, `gpt-6.1-terra`, `gpt-6.2-sol` × n = 6 on the card's four arms,
  **plus `raw`** (18 trials the card did not list: PLAN §3 puts `raw` in every cell and `series.py` flags a run
  without it). Tasks `1479041`. No `t01b` cell is reused: `t01b` ran on tasks `0dfaf98f`, before the step-1
  revision of `aspire-diagnose` changed the `lean` and `lean-start` sets, and the card names no reuse.
- **Gap** = median agent seconds of luna `aspire-lean` ÷ median of luna `aspire-lean-start`, over every graded trial.
- **Verdict.** `ship` (`aspire-start` stays in the proposal) if the gap is ≥ 1.20. `drop` (v0.0.6
  orchestration closed the gap by itself; `aspire-start` leaves the proposal) if it is < 1.20. Exact
  Mann-Whitney p and the terra and sol gaps are reported and do not change the verdict. If `aspire-lean-start`
  passes fewer luna trials than `aspire-lean`, that is reported next to the verdict.
- **Infrastructure.** As T1.1, top-ups in `t16-topup`.

#### T1.6 results

**Verdict: `drop`.** v0.0.6 orchestration closed most of the gap by itself, so `aspire-start` leaves the
proposal. On luna, `aspire-lean` without `aspire-start` took 61 s against 53 s with it, a gap of **1.16×**, under
the 1.20 the rule requires. The gap is real (exact Mann-Whitney p = 0.004: no `aspire-lean-start` trial is slower than any `aspire-lean` trial;
the slowest of one ties the fastest of the other at 55.3 s) but small, 8 s. On 11-09, with v0.0.5 orchestration, the
same pair was 82 s against 51 s (1.61×, n = 3). The other models show no gap: terra 0.94× (p = 0.39) and sol
0.99× (p = 1.0). Every trial passed.

**Round health.** Round `t16`, `cold-start`, tasks `1479041` (Bingo; `aspire-diagnose`'s revision does not
reach this scenario, since no trial loads it), Copilot CLI 1.0.99. 90 of 90 trials graded on the first pass: no
top-up, no timeout, no crash, no model-service 5xx, no harness-path access. The four luna `raw` folders that
another worktree had extracted early were deleted and fetched again after ingestion finalized. Series flags
(`series.md`): only `regress-tokens` on luna `aspire-skills`. Its tokens are 2.58× raw against 1.64× in the
11-09 n = 3 cell, which ran the v0.0.5 shipped set; with v0.0.6 the router also loaded in 4/6 trials. That
comes from per-trial numbers; the trajectories were not read.

**`t16`** (n = 6 per cell; time = agent seconds, median over all graded trials; p = exact Mann-Whitney
against raw; `raw` is the deviation the rule names; IDs are the first and last of each repeat group):

| Model | Arm | Time | Time ÷ raw | Tokens ÷ raw | Pass | Skills loaded | $/trial | Run IDs |
|---|---|---:|---:|---:|---|---|---:|---|
| luna | raw | 45 s | — | — | 6/6 | — | 0.003 | `2026111875592904`…`596236` |
| luna | aspire-cli | 51 s | 1.12× (p=0.093) | 0.84× | 6/6 | — | 0.003 | `2026111875624344`…`627634` |
| luna | aspire-skills | 60 s | 1.32× (p=0.0022) | 2.58× | 6/6 | `aspire-orchestration` 6/6, `aspire` 4/6 | 0.006 | `2026111875600722`…`604320` |
| luna | **aspire-lean** | 61 s | 1.35× (p=0.0022) | 2.27× | 6/6 | `aspire-orchestration` 6/6 | 0.005 | `2026111875609102`…`612446` |
| luna | **aspire-lean-start** | 53 s | 1.16× (p=0.017) | 1.80× | 6/6 | `aspire-start` 6/6 | 0.003 | `2026111875616716`…`619996` |
| terra | raw | 40 s | — | — | 6/6 | — | 0.022 | `2026111875631836`…`635162` |
| terra | aspire-cli | 54 s | 1.37× (p=0.0022) | 1.30× | 6/6 | — | 0.022 | `2026111875664318`…`667626` |
| terra | aspire-skills | 54 s | 1.34× (p=0.0022) | 2.18× | 6/6 | `aspire-orchestration` 6/6 | 0.033 | `2026111875639334`…`642594` |
| terra | **aspire-lean** | 53 s | 1.34× (p=0.0022) | 1.82× | 6/6 | `aspire-orchestration` 6/6 | 0.032 | `2026111875646850`…`650044` |
| terra | **aspire-lean-start** | 56 s | 1.42× (p=0.0022) | 1.91× | 6/6 | `aspire-start` 6/6 | 0.026 | `2026111875654760`…`658062` |
| `gpt-6.2-sol` | raw | 55 s | — | — | 6/6 | — | 0.160 | `2026111875673742`…`677028` |
| `gpt-6.2-sol` | aspire-cli | 55 s | 1.00× (p=0.70) | 0.59× | 6/6 | — | 0.101 | `2026111875707030`…`710258` |
| `gpt-6.2-sol` | aspire-skills | 52 s | 0.94× (p=0.31) | 1.10× | 6/6 | `aspire-orchestration` 6/6 | 0.157 | `2026111875681636`…`685190` |
| `gpt-6.2-sol` | **aspire-lean** | 50 s | 0.91× (p=0.39) | 1.08× | 6/6 | `aspire-orchestration` 6/6 | 0.149 | `2026111875689438`…`692554` |
| `gpt-6.2-sol` | **aspire-lean-start** | 51 s | 0.92× (p=0.59) | 1.03× | 6/6 | `aspire-start` 6/6 | 0.170 | `2026111875698208`…`701388` |

**Where the luna gap is** (from the trajectories, all 12 `aspire-lean`/`aspire-lean-start` trials and the six
`aspire-skills` trials):
- **With `aspire-start`**: the agent loads it and reads no reference. It runs `aspire start` 5–8 s into the run,
  using about 115k input tokens.
- **Without it**: the agent loads `aspire-orchestration` (6/6) and reads two or three of its references
  (`detection.md` and `app-commands.md` in 5/6; also `agent-workflows.md` or `safety-guardrails.md`), plus
  a git detection. It runs `aspire start` 9–13 s in, using 127k–271k input tokens.
- **After `aspire start`** the arms are close: a median 49 s (`aspire-lean`) against 46 s (`aspire-lean-start`),
  mostly the AppHost bringing up PostgreSQL, Redis and two projects. Of the 8 s gap, about 5.5 s comes before
  `aspire start` (the reference reading) and about 2.5 s after it.
- **The 11-09 penalty is mostly gone.** There `aspire-lean` followed 29 KB of references and a git detection
  sequence for 82 s. In `t16` it reads about as much (37 KB for the usual pair) and still starts within 13 s, so v0.0.6 changed how
  directly the orchestration skill leads to `aspire start`, not whether it is read. `t01b` (same v0.0.6, no
  `aspire-start` cell) had luna `aspire-lean` at 63 s (n = 6), so the change holds across two rounds.
- **The shipped set** (`aspire-skills`, router present) is level with `aspire-lean` on luna (60 s), so on cold
  start the router's removal no longer costs anything with v0.0.6. That was F21's reason for `aspire-start`.

**Against raw.** Cold start is still slower with Aspire on luna and terra, 1.12× to 1.42×, with p ≤ 0.017 in
every skilled cell. On `gpt-6.2-sol`, whose raw cold start is the slowest of the three (55 s), every Aspire arm is
level with or faster than raw (0.91×–1.00×, none significant). This is the first sol cold-start cell set at this pin.

**Cost.** $5.36 for 90 trials against the card's $4.80 for 72: luna $0.12, terra $0.81, sol $4.43
($0.15 per trial; raw $0.16, `aspire-cli` $0.10). The 18 `raw` trials the rule added cost $1.11.

**Open items.**
1. The `aspire-start` issue draft ([skills-remove-router-add-aspire-start.md](../upstream-issues/skills-remove-router-add-aspire-start.md))
   should drop `aspire-start` and keep only the router's removal, with this result as the reason. The drafts are
   not edited in this lane.
2. Whether `aspire-orchestration`'s references could be skipped on a plain "start the app" prompt is the
   remaining 8 s. That is a question about the v0.0.6 body for the Phase 3 skill audit, not for this card.

### T1.7 Second harness, one cell set

| | |
|---|---|
| Hypothesis | Router cost and `aspire-diagnose` selection are properties of the skills, not of Copilot CLI |
| Cells | `slow-sql`, `slow-redis` × luna × `raw`, `aspire-skills-mcp`, `aspire-lean` × 6 on the `claude-code` special agent (the catalogue serves the same CAPI models to every agent, so the model stays fixed) |
| Decision rule | Same direction as Copilot in both scenarios: the proposals are harness-neutral. Different: record which harness-specific mechanism (skill discovery path, MCP registration, context budget) explains it before any further harness work |
| Trials / cost | 2 × 3 × 6 = 36 ≈ $0.60. Same model, different harness, so a difference is attributable to the harness |
| Results | **no verdict** (2026-11-18): two probes showed the card cannot run as written. `claude-code` reaches only `/v1/messages`, which no GPT model serves, so luna cannot run under it. The task's MCP server and skills never reach Claude Code. The package pin does not pin the Claude Code CLI. [T1.7 results](#t17-results); the adapter is proposed as [T4.7](#t47-claude-code-adapter-proposed). Cost $0.07 (probes) |

#### T1.7 decision rule, as computed (written 2026-11-18, before round `t17` was submitted)

- **Probe first.** Round `probe-t17` (one `slow-sql`/`aspire-skills-mcp`/luna trial under `claude-code`,
  ledger `excluded`) must show where Claude Code discovers skills in this image, that `task.toml`'s MCP
  server reaches it, that the generic ATIF reader fills every field and that the verifier grades. If
  skills are not discovered from `/app/.github/skills`, no adapter is added without the user's approval
  (it would change task emission and force a re-pin), and only the cells that stay meaningful run:
  `raw` and `aspire-skills-mcp`, the latter then labelled MCP-only.
- **Cells.** Round `t17`, `slow-sql`, `slow-redis` × luna × `raw`, `aspire-skills-mcp`, `aspire-lean` × n = 6
  under `claude-code`; tasks `1479041`. **Copilot CLI reference in the same round** (`t17-copilot`, the same
  six cells under the pinned Copilot CLI, 36 luna trials the card did not list), because the `t01b`
  Copilot cells ran before the step-1 revision changed `aspire-lean`.
- **Same direction**, per scenario: for each Aspire arm, the `claude-code` time ratio to `raw` lies on
  the same side of 1.00 as the Copilot ratio of the same round, **and** the order of the two Aspire arms
  (which is faster) is the same; on `slow-redis` the pass counts of `aspire-lean` and `raw` also order the
  same way. Ratios within 0.90–1.10 count as level and match either side.
- **Verdict.** `ship` (harness-neutral) if both scenarios go the same direction. Otherwise `no verdict`,
  and the trajectories name the harness mechanism (skill discovery path, MCP registration, context budget)
  before further harness work.
- **Infrastructure.** As T1.1, top-ups in `t17-topup`.

#### T1.7 results

**Verdict: `no verdict`.** The probe step stopped the card. Under the `claude-code` harness the card's
model cannot run, and neither the skills nor the MCP server reach the agent. The cells would have
compared raw with an aspirified app that carries no skill and no MCP, which cannot speak to the
hypothesis ("router cost and `aspire-diagnose` selection are properties of the skills"). The session
that started this lane therefore closed the card without running them. T1.9 (VS Code agent mode, same
models) carries the harness-neutrality question in this phase. The adapter that would make the card
runnable is proposed as [T4.7](#t47-claude-code-adapter-proposed) and not built.

**Probes** (both `slow-sql`/`aspire-skills-mcp`, tasks `1479041`, package `claude-code=v0.33.1794879102`;
both rows are kept in `trials.jsonl` with an `excluded` reason, outside every cell):

| Round | Run ID | Model | Outcome | Agent s | Input tokens | Cost |
|---|---|---|---|---:|---:|---:|
| `probe-t17` | `2026111875131536` | `gpt-6-luna` | No model call succeeded: `API Error: 400 no model endpoints available given user constraints`, `X_AGENT_FAILURE` (an infrastructure-type row: no grade) | 5.8 | 0 | $0 |
| `probe-t17b` | `2026111875815010` | `claude-haiku-5.5` | Reward 1 (5 imports 6–10 ms, 5 updates 6–8 ms against a 571 ms baseline); 26 tool calls (`Bash` 25, `Read` 1), one `aspire describe`, no skill, no MCP call | 110.7 | 2.13 M | $0.067 |

**The three gaps, as observed.**
1. **GPT models are unreachable under `claude-code`.** The runner configures "direct /v1/messages API
   via CES proxy" (`runner.log`), and the CAPI sidecar log shows `POST /api/copilot/v1/messages` → 400.
   The catalogue (`msbench-cli registry list models`) lists `supported_endpoints` per model: `gpt-6-luna`
   and `gpt-6.1-terra` serve `/responses` and `ws:/responses`, `gpt-6.2-sol` `/responses` only, and every
   Claude 5.5 model `/v1/messages` and `/chat/completions`. The card's premise ("the catalogue serves the
   same CAPI models to every agent") does not hold for this harness: under it, only Claude models run.
   `claude-haiku-5.5` is priced like luna (10 / 50 per 1M input / output tokens).
2. **The task's MCP server and skills are not discovered.** Harbor uploads `task.toml`'s server to
   `/drop/mcp-config.json` and exposes it as `MSBENCH_MCP_CONFIG` (`harbor-setup-log.txt`). The `claude`
   command line the runner builds has no `--mcp-config`, and Claude Code's `init` event reports
   `"mcp_servers": []` in both probes. The image puts the skill set in `/app/.github/skills` (which Copilot
   CLI and VS Code read) and in `/opt/agent-skills` (the task's `skills_dir`). Claude Code reads
   `.claude/skills` (project) and its config directory's `skills/`, and its `init` lists only its 18 built-in
   skills. The haiku agent never used the Aspire skills. Its first file listing showed the `.github/skills`
   files (34 paths), and its third call filtered them out (`grep -v '^\.github/'`). Its trajectory has no
   `SKILL.md` read.
   Harbor's own `claude_code` agent would copy `skills_dir` into `$CLAUDE_CONFIG_DIR/skills` and write the
   MCP servers to `~/.claude.json`, but the MSBench special agent runs its own runner (`msbench_adapter_agent`
   → `run-claude-code-cli.sh`) and does neither.
3. **The package pin does not pin the CLI.** `agent_settings.json` records `agent_version_requested:
   "latest"` (source: default) and `agent_version_used: "2.1.327"`. `submit.sh` pins the special-agent
   package, but the Claude Code CLI inside it is whatever is latest on the day of the run.

**The ATIF reader works on a `claude-code` row.** `collect.py`'s generic reader filled the haiku probe's row
from `trajectories/trajectory.json`: tool counts, `models_called` (`claude-haiku-5-5`, the provider's
spelling), `aspire_cli`, phase markers (root cause seen 34 s, first fix 74 s), `agent_loop_seconds` 100.9 s,
and tokens and cost from Harbor's `agent_result`. Not exercised, because neither occurred: skill loads
(Claude Code's tool is `Skill`, not Copilot's `skill`) and MCP calls (Claude Code names them
`mcp__<server>__<tool>`, which `canonical_tool` does not map yet). `model_service_5xx` stays empty, as for
every ATIF row. T4.7 lists these as reader changes.

**Cells run anyway.** Round `t17-copilot` was submitted before the probe returned, as the card's
same-round Copilot CLI reference: `slow-sql`, `slow-redis` × luna × `raw`, `aspire-skills-mcp`,
`aspire-lean` × 6, 36 trials. It is kept as Copilot CLI luna cells on tasks `1479041`, the first luna
`slow-sql`/`slow-redis` cells with the revised step 1, and decides nothing for T1.7. 36 of 36 graded, no
5xx (n = 6; time = agent seconds, median; p = exact Mann-Whitney against raw; `t01b` ÷ raw is the same cell
on tasks `0dfaf98f`, before the step-1 revision):

| Scenario | Arm | Time | ÷ raw | `t01b` ÷ raw | Pass (`t01b`) | Skills loaded | Run IDs |
|---|---|---:|---:|---:|---|---|---|
| slow-sql | raw | 99 s | — | — | 6/6 (6/6) | — | `2026111875714410`…`717580` |
| slow-sql | aspire-skills-mcp | 232 s | 2.34× (p=0.0022) | 2.24× | 5/6 (6/6) | `aspire-monitoring` 5/6, `aspire` 4/6 | `2026111875721784`…`725000` |
| slow-sql | aspire-lean | 125 s | 1.26× (p=0.49) | 1.39× | 6/6 (6/6) | `aspire-diagnose` 6/6 | `2026111875729204`…`732400` |
| slow-redis | raw | 220 s | — | — | 0/6 (1/6) | — | `2026111875736700`…`739832` |
| slow-redis | aspire-skills-mcp | 170 s | 0.77× (p=0.31) | 0.39× | 0/6 (0/6) | `aspire` 4/6, `aspire-monitoring` 4/6 | `2026111875744180`…`747432` |
| slow-redis | aspire-lean | 103 s | 0.47× (p=0.065) | 0.41× | **5/6** (4/6) | `aspire-diagnose` 6/6 | `2026111875751704`…`754982` |

They repeat `t01b` on luna. The shipped set with MCP is 2.3× raw on `slow-sql` and fails `slow-redis` 0/6.
`aspire-lean` passes `slow-redis` 5/6 against raw's 0/6, the luna result that carries `aspire-diagnose`.
The revised step 1 did not cost these cells anything. These are per-trial numbers; the trajectories were not read.
`series.md` flags `selection-low` on `slow-redis` `aspire-skills-mcp`: a skill loaded in 4/6 trials, which
made a median of 10 MCP calls. One `aspire-lean` `slow-redis` trial ran 738 s (`2026111875754982`, passed);
it was not read.

**Cost.** Probes $0.07; `t17-copilot` $0.74.

### T1.8 Model lane: Opus 5.5 and GPT-6.2 Sol

| | |
|---|---|
| Hypothesis | The three findings that carry the proposals (shipped set slower than raw where the log has the evidence; lean at parity there; lean decisive on the silent fault) hold on the strongest models, and the cheapest-model effects (router mis-selection, patching the app on `slow-redis`) do not appear |
| Probe | One `cold-start`/`raw` trial per model submitted 2026-11-17 under the pinned Copilot CLI package to confirm the IDs run: result recorded below before any cell is scheduled |
| Arms | `raw`, `aspire-skills-mcp` (v0.0.6), `aspire-lean` |
| Cells | `slow-sql`, `read-only`, `slow-redis` × `claude-opus-5.5`, `gpt-6.2-sol` × 6 |
| Decision rule | Informational for the proposals, decisive for the model table in REPORT §4.4: each model gets a row. If Opus or 6.2-sol fail `slow-redis` on any arm, that arm's failure path is added to §6 of the report. If `aspire-lean` is slower than `raw` by more than 20% on a strong model with p < 0.05, the skill is costing a model that did not need it and the trigger or body is revised for that case |
| Trials / cost | 3 × 3 × 2 × 6 = 108: sol 54 ≈ $6.40, Opus 54 ≈ $13.50 (assumed; the probe gives the first real number) |
| Results | **Probe passed** for both: `gpt-6.2-sol` reward 1 in 47 s, 94k input tokens, $0.114; `claude-opus-5.5` reward 1 in 48 s, 131k input tokens, $0.168 (one `cold-start`/`raw` trial each, Copilot CLI 1.0.99, rows in `trials.jsonl` round `probe-models`). For scale, `gpt-6.1-sol` cost $0.037 to $0.041 on the same cell, so both new models look two to four times dearer per trial than assumed; the budget lines are re-estimated after the first T1.8 cells. **Cells: `revise`** (2026-11-18, round `t18`, 108 trials, every cell 6/6): Opus `slow-sql` `aspire-lean` 1.45× raw (p = 0.026) trips the 20 % rule, because Opus sleeps 15–45 s for new telemetry before confirming a fix. Step 4's "confirm on fresh traffic" adds to the wait but is not its only cause: Opus also waits with the shipped set. A step-4 edit with an Opus `aspire-cli` control is proposed, not applied. Shipped set 1.20×–1.91× raw on the log-visible faults, lean 0.57×/0.42× on `slow-redis`; [T1.8 results](#t18-results). Cost $35.43 (sol $0.287, Opus $0.370 per trial) |

#### T1.8 decision rule, as computed (written 2026-11-18, before round `t18` returned any trial)

- **Cells.** Round `t18`, `slow-sql`, `read-only`, `slow-redis` × `raw`, `aspire-skills-mcp`, `aspire-lean` ×
  `gpt-6.2-sol`, `claude-opus-5.5` × n = 6, Copilot CLI, tasks `1479041` (`aspire-lean` carries the revised
  step 1; the `t01b` lean cells did not).
- **20 % rule**, per model × scenario: `aspire-lean` median agent seconds ÷ `raw` > 1.20 **and** exact
  Mann-Whitney p < 0.05 → the skill costs a model that did not need it; a revision of the trigger or body
  for that case is proposed here (the skill is not edited in this lane).
- **`slow-redis` failures.** Any strong-model arm below 6/6 on `slow-redis` gets its failure path, read from
  the trajectories, added to REPORT §6.
- **Verdict.** `ship` (the lean proposal holds on the strong models) if no cell trips the 20 % rule and
  `aspire-lean` passes no more than one trial fewer than `raw` in every cell. `revise` if any cell trips the
  20 % rule. Pass-rate shortfalls without a time violation are reported and do not change the word.
  REPORT §4.4 gains one row per model either way.
- **Cost.** Real per-trial cost per model and scenario from `trials.jsonl`; the budget lines in §1, §3 and
  §9 are re-estimated from it.
- **Infrastructure.** As T1.1, top-ups in `t18-topup`.

#### T1.8 results

**Verdict: `revise`.** One cell trips the 20 % rule. On `claude-opus-5.5` `slow-sql`, `aspire-lean`
took 86 s against raw's 59 s, 1.45× (p = 0.026). The cause, read from the trajectories, is Opus waiting for new
telemetry: whenever it confirms a fix through traces or logs, it sleeps 15–45 s first. It does this with
the shipped set too, including trials that loaded no skill. Step 4 of `aspire-diagnose` ("confirm on fresh
traffic, using the same filter") makes telemetry the confirmation route in every lean trial and adds to the
wait on `slow-sql`, so it is **part** of the cause. A step-4 revision is proposed below, with a control; the
skill is not edited in this lane.
Every other cell is within the rule:
- Opus `read-only` 1.35× (p = 0.065), the same mechanism, not significant.
- Sol `read-only` 1.21× (p = 0.093) and sol `slow-sql` 1.03×.
- `aspire-lean` passed 6/6 in all six cells, as did every raw and shipped-set cell, so no pass-rate condition applies.

**Round health.** Round `t18`, tasks `1479041` (`aspire-lean` carries the revised step 1), Copilot CLI
1.0.99. 108 of 108 trials graded on the first pass: no top-up, no timeout, no crash, no model-service 5xx.
**Harness-path access in 9 trials, all on `slow-redis`**, whose exporter process is visible in `ps` (the F26 route):
- `gpt-6.2-sol` raw: 5/6 read `/opt/benchmark/traffic.mjs` (two also `endpoints.json`).
- sol `aspire-skills-mcp` 1 and Opus `aspire-lean` 1 listed `/opt/benchmark`.
- Opus `aspire-skills-mcp` 1 read `entrypoint.sh`.
- One trial read the verifier: Opus raw `2026111875517718` ran `grep "report|exporter" /opt/benchmark/bench.mjs`
  (step 13). That returned the lines saying the session keyspace must be preserved and that stopping the
  exporter is the reference repair. The agent had already killed the exporter at step 12. It then rewrote the
  exporter to use `SCAN`, restarted it, and passed.

No pre-registered rule covers a leak, so every trial stays in the table. Without `2026111875517718`, Opus
`slow-redis` `aspire-lean` is 0.49× raw instead of 0.42×. No cell that decides the verdict involves these trials.
[F26](../FINDINGS.md#f26-agents-find-the-traffic-generator-through-ps-and-read-it-only-a-per-run-leak-check-catches-it) is updated.
Series flags (`series.md`): `leak` on the six `slow-redis` cells above, and `selection-low` on Opus `read-only`
`aspire-skills-mcp`, where a skill loaded in only 2/6 trials (the router).

**`t18`** (n = 6 per cell; time = agent seconds, median over all graded trials; p = exact Mann-Whitney
against raw; IDs are the first and last of each repeat group, every ID is in `ledger.jsonl` with `round: t18`):

| Scenario | Model | Arm | Time | Time ÷ raw | Tokens ÷ raw | Pass | Skills loaded | $/trial | Run IDs |
|---|---|---|---:|---:|---:|---|---|---:|---|
| slow-sql | `gpt-6.2-sol` | raw | 51 s | — | — | 6/6 | — | 0.165 | `2026111875193560`…`204468` |
| slow-sql | `gpt-6.2-sol` | aspire-skills-mcp | 61 s | 1.20× (p=0.011) | 2.06× | 6/6 | `aspire-monitoring` 6/6, `aspire` 1/6 | 0.280 | `2026111875219452`…`226596` |
| slow-sql | `gpt-6.2-sol` | **aspire-lean** | 53 s | 1.03× (p=0.94) | 1.45× | 6/6 | `aspire-diagnose` 6/6 | 0.229 | `2026111875240770`…`255870` |
| slow-sql | `claude-opus-5.5` | raw | 59 s | — | — | 6/6 | — | 0.268 | `2026111875411994`…`422644` |
| slow-sql | `claude-opus-5.5` | aspire-skills-mcp | 77 s | 1.30× (p=0.065) | 1.61× | 6/6 | `aspire` 3/6, `aspire-monitoring` 2/6 | 0.388 | `2026111875434126`…`440754` |
| slow-sql | `claude-opus-5.5` | **aspire-lean** | 86 s | **1.45×** (p=0.026) | 0.93× | 6/6 | `aspire-diagnose` 6/6 | 0.259 | `2026111875484724`…`488124` |
| read-only | `gpt-6.2-sol` | raw | 36 s | — | — | 6/6 | — | 0.156 | `2026111875271130`…`280742` |
| read-only | `gpt-6.2-sol` | aspire-skills-mcp | 52 s | 1.44× (p=0.0022) | 2.72× | 6/6 | `aspire-monitoring` 6/6, `aspire` 5/6 | 0.312 | `2026111875297570`…`304660` |
| read-only | `gpt-6.2-sol` | **aspire-lean** | 44 s | 1.21× (p=0.093) | 1.67× | 6/6 | `aspire-diagnose` 6/6, `aspire-orchestration` 1/6 | 0.244 | `2026111875318344`…`328200` |
| read-only | `claude-opus-5.5` | raw | 64 s | — | — | 6/6 | — | 0.267 | `2026111875492924`…`496458` |
| read-only | `claude-opus-5.5` | aspire-skills-mcp | 122 s | 1.91× (p=0.0022) | 1.83× | 6/6 | `aspire` 2/6 | 0.425 | `2026111875501110`…`504464` |
| read-only | `claude-opus-5.5` | **aspire-lean** | 86 s | 1.35× (p=0.065) | 1.04× | 6/6 | `aspire-diagnose` 6/6 | 0.274 | `2026111875508712`…`512000` |
| slow-redis | `gpt-6.2-sol` | raw | 147 s | — | — | 6/6 | — | 0.346 | `2026111875341226`…`350432` |
| slow-redis | `gpt-6.2-sol` | aspire-skills-mcp | 128 s | 0.87× (p=0.48) | 1.43× | 6/6 | `aspire-monitoring` 6/6 | 0.473 | `2026111875364362`…`374646` |
| slow-redis | `gpt-6.2-sol` | **aspire-lean** | 83 s | 0.57× (p=0.0043) | 0.97× | 6/6 | `aspire-diagnose` 6/6 | 0.374 | `2026111875387796`…`394482` |
| slow-redis | `claude-opus-5.5` | raw | 266 s | — | — | 6/6 | — | 0.422 | `2026111875516412`…`519778` |
| slow-redis | `claude-opus-5.5` | aspire-skills-mcp | 271 s | 1.02× (p=0.82) | 2.35× | 6/6 | `aspire` 4/6, `aspire-monitoring` 2/6 | 0.712 | `2026111875524352`…`527708` |
| slow-redis | `claude-opus-5.5` | **aspire-lean** | 113 s | 0.42× (p=0.065) | 0.76× | 6/6 | `aspire-diagnose` 6/6 | 0.311 | `2026111875531810`…`535138` |

**The card's hypothesis, finding by finding.**
- **The shipped set is slower than raw where the log has the evidence**, on both strong models:
  `slow-sql` 1.20× (sol, p = 0.011) and 1.30× (Opus, p = 0.065), `read-only` 1.44× and 1.91× (both
  p = 0.0022). Holds.
- **Lean is at parity there**: holds on sol (1.03×, 1.21×, neither significant), not on Opus (1.45×
  significant, 1.35× not). On Opus the lean set is still faster than the shipped set on `read-only` (86 s against 122 s), and
  slower on `slow-sql` (86 s against 77 s).
- **Lean is decisive on the silent fault**: on time, yes: `slow-redis` 0.57× (sol, p = 0.0043) and 0.42×
  (Opus, p = 0.065). Not on pass rate: raw passed 6/6 on both, unlike luna (1/6 in `t01b`).
- **The cheapest-model effects**: patching the application on `slow-redis` did not appear (no strong-model
  trial edited a `.cs` file there, 0/36). Router mis-selection did, on Opus: with the shipped set Opus loaded
  the `aspire` router in 9/18 diagnosis trials, `aspire-monitoring` in 4/18 and no skill in 5/18. Sol loaded
  `aspire-monitoring` 18/18, plus the router 6/18, the terra pattern from 11-09. `aspire-diagnose` was loaded in
  36/36 `aspire-lean` trials.
- **MCP was barely used on the strong models.** With the shipped set and MCP, Opus made 0.39 MCP calls per
  trial and sol 0.06. They read logs and traces through the CLI and `docker exec`, so the shipped arm's cost
  over raw is the skill reading and the waits, not MCP output.

**Why Opus with `aspire-lean` is slower on the log-visible faults** (from the trajectories and step
timestamps). It reaches the cause and the first fix sooner than raw: on `slow-sql` it sees the cause after a
median 14 s against 25 s and makes its first fix after 25 s against 33 s. Then it spends a median 57 s after
the fix against raw's 32 s. In 6/6 `slow-sql` and 6/6 `read-only` `aspire-lean` trials Opus ran `sleep 15`
to `sleep 45` (median total 30 s and 34 s), in 11 of the 12 followed by `aspire otel traces --search "name:…"`, waiting for
fresh traffic as step 4 says ("Then confirm on fresh traffic, using the same filter that showed the problem").
Raw Opus confirmed with `curl` requests to the endpoint (for example `2026111875420550`, steps 7–8, about 36 s from fix to end).
Sol never ran step 4's filter (0/18 trials) and confirmed by request, which is why sol is at parity on the
same skill text.

**The wait is not step 4 alone.** With the shipped set, which has no step 4, Opus also slept before re-reading
telemetry: on `slow-sql` in 5/6 trials (median total 15 s, `sleep 15`/`sleep 20` then `aspire otel traces
boardadmin --search import`), and on `read-only` in 6/6 (median 32 s, then `aspire otel logs`). On `read-only`
that includes trials that loaded no skill at all: `2026111875501782` ran `sleep 15` and then `sleep 10`, and
`2026111875502452` ran `sleep 45`. So Opus waits for new telemetry whenever telemetry is how it checks a
fix. Step 4 makes that the route in every `aspire-lean` trial and doubles the wait on `slow-sql` (30 s against
15 s with the shipped set). On `read-only` it adds nothing over the shipped set (34 s against 32 s). This is
also part of the shipped set's 1.91× on `read-only`.

**Proposal (step 4 only, not applied; it may not restore parity alone).** Replace "Then confirm on fresh traffic, using the same filter
that showed the problem" with a confirmation that does not wait: "Confirm with one request to the affected
operation if you can make one (its time or status shows the fix). Use `aspire otel traces -n 5 --search
"name:<operation fragment>"` only when you cannot call it yourself; live traffic produces new traces within
seconds, so do not sleep before querying." Steps 1–3 are untouched (step 1 is frozen per T1.1). The edit
touches the route every model takes, so before it ships it runs as an `aspire-lean` variant on Opus
`slow-sql` and `read-only` (the cells that failed) with luna `slow-sql` and `slow-redis` guard cells (PLAN §3),
**and an Opus `aspire-cli` control** on the same two scenarios (aspirified app, no skill; no such cell exists
yet). The control shows how much of the wait comes with the aspirified app whatever the skill says. The edit
must keep luna's `slow-redis` pass count.

**`slow-redis` failure paths for REPORT §6: none.** Every strong-model trial on every arm passed. Opus raw is
the slow cell (266 s): it reads the source, then runs `redis-cli` commands such as `DBSIZE` against the blocked
cache and waits on them for minutes before `CLIENT LIST` and `ps` lead it to the exporter (for example `2026111875517056`,
steps 10–19). `aspire-lean` sends it to `SLOWLOG`/`CLIENT LIST` first (cause seen at a median 50 s against 128 s).

**Cost and the budget re-estimate.** Model cost $35.43 against the card's $19.90:
- `gpt-6.2-sol`: $15.47 for 54 trials, **$0.287 per trial** ($0.22 `slow-sql`, $0.24 `read-only`,
  $0.40 `slow-redis`), against the $0.118 assumed. That is 2.4×; the assumption was 6.1-sol's measured mean.
- `claude-opus-5.5`: $19.96 for 54 trials, **$0.370 per trial** ($0.31, $0.32, $0.48), against the $0.25 assumed (1.5×).
- On the held-out app (T1.1): sol $0.35, Opus $0.37 per trial.
- A six-trial decision cell therefore costs about $1.70 on sol and $2.20 on Opus, not $0.71 and $1.50.

The budget lines in §1, §3 and §9 are updated with these rates.

### T1.9 VS Code lane

| | |
|---|---|
| Hypothesis | The shipped set's penalty, `aspire-diagnose`'s gain and the router's mis-selection are properties of the skills and tools, not of the Copilot CLI harness. VS Code is where most users meet them |
| Harness | `vscode` only: VS Code agent mode, the product's own agent loop, with skills from `.github/skills` and the MCP server registered at user scope (from `agents/vscode/mcp`, not `.vscode/mcp.json`; see [T0.4 results](#t04-results), which also lists the timing corrections this lane needs). The other VS Code variants (`vscode-copilot-cli`, `vscode-ahp`, `vscode-claude`) host a different engine inside VS Code and would collide with the Copilot CLI rows already measured, so they are out of scope |
| Prerequisite | T0.4 |
| Arms | `raw`, `aspire-skills-mcp` (v0.0.6), `aspire-lean` |
| Cells | `slow-sql`, `slow-redis`, `cold-start` × luna, terra × 6 |
| Decision rule | Harness-neutral if the ratio to `raw` of each Aspire arm is within 15 points of the Copilot CLI ratio from T0.1 in every cell and `slow-redis` luna pass counts differ by at most one trial. Otherwise the trajectories name the mechanism (skill not discovered, approval prompt, MCP not registered, different tool set) and that becomes a card of its own before any skill verdict is called general. Because the two harnesses differ in both engine and surface, a gap is attributed only after the trajectory shows which |
| Guard | None beyond the cells; `slow-redis` luna is in the set |
| Trials / cost | 3 × 3 × 2 × 6 = 108 ≈ $4.40 |
| Results | **harness-dependent** (2026-11-18, round `t19`, 108 trials, $5.31): not harness-neutral by the rule; 7 of 12 Aspire cells outside ±0.15, explained by three VS Code mechanisms, written as proposed cards T4.8 and T4.9. The lean arm loads `aspire-diagnose` and both arms load `aspire-orchestration` on cold start under both harnesses; the shipped set's router and monitoring loads differ by harness. `cold-start` grades under VS Code (36/36). [Results](#t19-results) |

#### T1.9 decision rule, as computed (written 2026-11-18, before any `t19` result was read)

- **Round `t19`**, `BENCH_AGENT=vscode`, tasks `1479041`. Agent timeout scaled ×1.3 (1,170 s, `BENCH_AGENT_TIMEOUT_MULTIPLIER`, recorded in the ledger) because VS Code spends about 240 s of the budget before work starts (43–55 s launch, 186 s transport fallback; T0.4) and Copilot `t01b` trials reached 796 s of 900 s. The terra `cold-start` cells are submitted only after one luna `cold-start` trial per arm has graded, to show the harness leaves the app running for the verifier.
- **Time:** per trial `agent_loop_seconds − transport_wait_seconds` (VS Code); Copilot CLI's `agent_loop_seconds` (its transport wait is 0). Ratio = median of the arm ÷ median of `raw`, same harness, round, scenario and model. Copilot ratios come from `t01b`.
- **Harness-neutral** if for every Aspire arm × scenario × model `|ratio_vscode − ratio_copilot| ≤ 0.15` (ratio points) **and**, on `slow-redis` luna, each of the three arms' pass counts differ from Copilot's `t01b` count by at most one. Otherwise each cell outside is attributed from the trajectory (skill not discovered, approval prompt, MCP not registered, different tool set, subagent on another model) and written as a new card proposal, not a skill verdict.
- **Skill-text drift:** `t01b`'s `aspire-lean` ran the pre-T0.2 `aspire-diagnose` text; `t19` runs the revised step 1. An `aspire-lean` cell outside the band is first checked against `t14`'s same-pin Copilot `aspire-lean` (`slow-redis` luna) and for use of the revised branch (`duration:>5000`) before the gap is attributed to the harness.
- A trial that hits the time limit is reported separately from agent failures; a trial lost before the agent ran (image build, dependency install) is re-run once.


#### T1.9 results

**Verdict: `harness-dependent`.** By the rule as computed, 7 of the 12 Aspire cells lie outside
±0.15 ratio points of Copilot CLI's `t01b` ratio, so VS Code's ratios are not Copilot's. The `slow-redis`
luna pass-count clause holds (raw 0 vs 1, `aspire-skills-mcp` 0 vs 0, `aspire-lean` 4 vs 4). VS Code
discovers the skills: `aspire-lean` loaded `aspire-diagnose` in every trial and every arm loaded
`aspire-orchestration` on cold start, as under Copilot CLI. The shipped set's loads differ by harness: luna
loaded the `aspire` router first in 4–5 of 6 `slow-sql`/`cold-start` trials under Copilot CLI and 0–1 under
VS Code; terra `slow-sql` the reverse (VS Code 5/6, Copilot CLI 0/6); luna `slow-redis` loaded no skill in 4/6
under Copilot CLI and `aspire-monitoring` in 4/6 under VS Code. Most gaps come from three harness mechanisms,
written as proposed cards T4.8 and T4.9 in §8; two terra `aspire-lean` cells stay unattributed (below). They are
not skill verdicts.

Round `t19`, `BENCH_AGENT=vscode` (package `vscode=0.20261117.7`, VS Code 1.146.0-insider), tasks `1479041`, Harbor agent timeout ×1.3. No
model-service 5xx. Five trials ran to VS Code's own `agentSeconds: 720` limit (`user-overrides.yaml`; the
Harbor multiplier does not raise it), which `collect.py` marks as infrastructure: four on
`aspire-skills-mcp` (`slow-sql` luna ×2, terra ×1; `slow-redis` terra ×1) and one raw (`slow-redis` terra).
They are time-limit failures of the agent and are shown in the pass column (pass/6); medians are over graded
trials. `cold-start` grades under VS Code: 36/36 reward 1, the harness leaves the app running.

| Scenario | Model | Arm | VS Code pass | VS Code net s | ratio | Copilot `t01b` pass / ratio | Δ | Run IDs |
|---|---|---|---|---:|---:|---|---:|---|
| slow-sql | luna | raw | 1/6 | 159 | 1.00 | 6/6 / 1.00 | | 2026111876450860 – 76904960 |
| slow-sql | luna | aspire-skills-mcp | 3/6 (2 at limit) | 361 | 2.27 | 6/6 / 2.29 | −0.02 | 2026111876966820 – 77371076 |
| slow-sql | luna | aspire-lean | 5/6 | 232 | 1.46 | 6/6 / 1.40 (revised text `t17-copilot`: 1.27) | +0.05 | 2026111877549500 – 80146060 |
| slow-sql | terra | raw | 6/6 | 94 | 1.00 | 6/6 / 1.00 | | 2026111876032592 – 76407326 |
| slow-sql | terra | aspire-skills-mcp | 5/6 (1 at limit) | 125 | 1.34 | 6/6 / 1.36 | −0.03 | 2026111876477520 – 76955516 |
| slow-sql | terra | aspire-lean | 6/6 | 118 | 1.26 | 6/6 / 1.05 | **+0.21** | 2026111877070862 – 79921122 |
| slow-redis | luna | raw | 0/6 | 100 | 1.00 | 1/6 / 1.00 | | 2026111876029484 – 76382530 |
| slow-redis | luna | aspire-skills-mcp | 0/6 | 200 | 2.00 | 0/6 / 0.38 | **+1.61** | 2026111876439856 – 76891444 |
| slow-redis | luna | aspire-lean | 4/6 | 275 | 2.75 | 4/6 / 0.40 (revised text `t14`, `t14-guard`, `t17-copilot`: 0.45–0.54) | **+2.35** | 2026111876989218 – 77415034 |
| slow-redis | terra | raw | 5/6 (1 at limit) | 187 | 1.00 | 6/6 / 1.00 | | 2026111876043314 – 76337566 |
| slow-redis | terra | aspire-skills-mcp | 4/6 (1 at limit) | 265 | 1.42 | 6/6 / 1.00 | **+0.41** | 2026111876395362 – 76771880 |
| slow-redis | terra | aspire-lean | 6/6 | 174 | 0.93 | 6/6 / 0.33 | **+0.60** | 2026111876836668 – 77357796 |
| cold-start | luna | raw | 6/6 | 50 | 1.00 | 6/6 / 1.00 | | 2026111875809600 – 76192302 |
| cold-start | luna | aspire-skills-mcp | 6/6 | 65 | 1.29 | 6/6 / 1.43 | −0.14 | 2026111875499394 – 76113438 |
| cold-start | luna | aspire-lean | 6/6 | 90 | 1.78 | 6/6 / 1.60 (revised text `t16`: 1.39) | **+0.17** | 2026111876060608 – 76388450 |
| cold-start | terra | raw | 6/6 | 45 | 1.00 | 6/6 / 1.00 | | 2026111881235684 – 81615576 |
| cold-start | terra | aspire-skills-mcp | 6/6 | 44 | 0.96 | 6/6 / 1.23 | **−0.27** | 2026111881192714 – 81637966 |
| cold-start | terra | aspire-lean | 6/6 | 61 | 1.33 | 6/6 / 1.38 (revised text `t16`: 1.34) | −0.04 | 2026111881246992 – 81738726 |

Net s = median `agent_loop_seconds − transport_wait_seconds` (VS Code); Copilot ratios use `agent_loop_seconds`.
Each cell's run IDs share the prefix `20261118`, and the range is first to last of six.

**Mechanisms** (from `tool_counts`, `mcp_calls`, `skills_loaded`, `models_called`):

1. **Under VS Code, raw luna edits instead of investigating, so the raw denominator is a fast failure.**
   (Read in trajectory 2026111876690348: 17 reads and searches of the C# source, one `git status`, an
   `apply_patch` making `BingoService.cs`'s Redis reads concurrent, a build, and a final message claiming the
   fix; no query of the database and no restart of the app.) Raw
   luna ran a median 5 shell commands on `slow-sql` and 2.5 on `slow-redis`, against Copilot CLI's 13 and 24.5,
   with 17–18 `read_file`/`grep_search`/`file_search` calls and an `apply_patch` of the application. 5 of 6
   `slow-sql` trials patched code and left the 2 s write in place; every `slow-redis` trial stopped after
   95–180 s (median 100) with status still at 8–12 s. With `aspire-lean`, VS Code luna ran 14–19.5 shell commands, as many as
   under Copilot CLI, and passed 5/6 and 4/6. The skill turns luna from editing to running commands under
   VS Code. Measured on pass rate, Aspire's effect is larger under VS Code than under Copilot CLI
   (`slow-sql` 1/6 → 5/6; `slow-redis` 0/6 → 4/6), and the time ratio inverts it: that is the
   `slow-redis` luna gap (+1.61, +2.35). Terra investigates with raw under both harnesses (12.5–29 shell
   commands). The two terra `aspire-lean` cells outside the band are **unattributed**: `slow-sql` (+0.21 on
   `t01b`; +0.42 against the revised-text Copilot ratio, 0.84 from `t210`'s lean control over `t01b` raw), so
   not lean drift, and `slow-redis` (+0.60; no revised-text Copilot terra cell exists). Both load
   `aspire-diagnose` 6/6 with tool counts close to Copilot CLI's (22 vs 20.5; 34.5 vs 20.5 on `slow-redis`).
2. **VS Code defers MCP tools behind `tool_search`.** In every trajectory with an MCP call (13, luna and
   terra) `tool_search` is the call immediately before the first `mcp_aspire-*` call; terra never did on `slow-sql` or `cold-start` (0 MCP calls in 12 trials, against
   a median of 7 under Copilot CLI on `slow-sql`), and on `slow-redis` 3 of 6 did. Under VS Code,
   `aspire-skills-mcp` is mostly the skills arm. That explains `cold-start` terra (−0.27: no MCP detour) and
   part of `slow-redis` terra (+0.41, with the shell instead).
3. **The VS Code limit is shorter than Copilot CLI's.** After the ~186 s transport fallback, 720 s leaves
   about 534 s of work against Copilot CLI's 900 s. The four `aspire-skills-mcp` trials at the limit would
   have run on under Copilot CLI, so that arm's VS Code medians are low and its pass counts are a lower bound.

Not a mechanism here: subagents. VS Code started `gpt-5.6-luna` subagents in 12 luna trials (none on terra)
and calls `gpt-4o-mini` in every trial, but `cold-start` luna lean trials without subagents took 81–92 s as
well. That cell's gap (+0.17 on `t01b`, +0.39 on the revised `t16` ratio) is lean's extra turns at VS Code's
slower pace: lean adds 6 tool calls over raw under VS Code (14 vs 8) and 4.5 under Copilot CLI (11.5 vs 7). Lean drift: on the revised text, the Copilot ratios move by up to 0.13 between rounds of the same
cell (`slow-sql` luna 1.27 to 1.40), about the width of the ±0.15 band, so single-round ratio comparisons of
one cell are close to the noise.

**Cost** $5.31 for 108 trials against $4.40 estimated. Submission: CES returned 502 on `startRun` for VS Code
submissions in bursts; partial batches were completed one trial per submission with retries, and Kusto
matches the ledger (no orphan runs).

---

## 6. Phase 2: product changes not yet built

Each is a change in `microsoft/aspire` or in the aspirified template, measured on a
source build against its `-src` control.

### T2.1 Compact `list_resources` and `list_console_logs`

| | |
|---|---|
| Hypothesis | The two MCP tools every trial calls and patch 0001 left alone (10 KB for 8 resources, 35 KB of console logs) carry the remaining MCP penalty |
| Change | `list_resources`: name, type, state, health, URLs, one line per resource; command names only, descriptions on request. `list_console_logs`: `limit` (default 50) and `severity`/`search` honoured server-side |
| Cells | `slow-sql`, `read-only` × luna, terra × 6, `aspire-mcp-compact2` vs `aspire-mcp-compact`; guard `slow-redis` luna |
| Decision rule | Ship if characters read drop ≥ 30% and time does not regress; the time gain is expected to be small and is not the gate |
| Trials / cost | 2 × 2 × 2 × 6 + 6 = 54 ≈ $2.00 |
| Results | **2026-11-19: `drop`.** Verdict: drop, by the rule as computed at read time (characters read in total: −16 % to −23 % in three cells, +11 % in luna `slow-sql`, no cell under −30 %). Under the coordinating session's metric ruling (MCP-tool content chars; sent before the results existed, received after they were read) the reading is revise on one cell (terra `slow-sql` −35 %); the guard fails under both (2/6 against 4/6), so the patch is not proposed either way. `list_resources` shrank from 10,321 to a median 1,360–2,252 characters per call; neither tool crossed Copilot CLI's 20 KB spill threshold in either arm, so the F31 mechanism was not in play. [T2.1 results](#t21-results) below |

#### T2.1 decision rule, as computed (written 2026-11-18, before any `t21` result was read)

- **Round `t21`**, Copilot CLI 1.0.99, pin 2026-11-17, n = 6 per cell, on the additive re-pin that adds the arms below
  (existing tasks byte-identical). Same-round `raw` on `slow-sql`, `read-only` × luna, terra and `slow-redis` luna, for the
  series only; no clause reads it. The controls' tasks build from suite `305a8ed` (no-skill arms) and `c28f654` (lean
  `slow-redis` arms); between those and this re-pin `common/` changed only on paths these scenarios do not take
  (cold-start, selection and stuck-db branches, app variants, other arms' patches, skill sets and `AGENTS.md` files), and
  the template's new build arguments are empty here, so each new arm differs from its control by the patch alone.
- **Local gates** (`local.sh`'s up → verify fails → reference repair → verify passes, run under `p2mcp-*` image names):
  `slow-sql` × `aspire` none × `mcp-compact2` (adding 5 squares 2,616 ms before repair, pass after) and × `mcp-tools8`
  (2,408 ms, pass after), 2026-11-18.
- **Patch.** `common/aspire-patches/mcp-compact2.patch`, built from source at `30326eb8` like every `-src` arm: patch 0001
  verbatim plus (1) `list_resources` returns one line per resource (name, display name, type, source, state, health,
  exit code, waiting-for, endpoint URLs, command names; disabled commands marked) and the full JSON only with
  `details: true`, optionally for one `resourceName`; (2) `list_console_logs` takes `limit` (default 50, up to 2,000) and
  `severity` (`Error` / `Warning`: lines written to stderr or carrying a level marker, plus their indented continuation
  lines), both applied server-side before the 8k-token cap. Local Aspire branch `sebros/p2-mcp-compact2` (never pushed).
- **Arms.** `aspire-mcp-compact2` against `aspire-mcp-compact` (patch 0001 alone) on `slow-sql`, `read-only` × luna, terra.
  **Guard** `aspire-lean-mcp-compact2` against `aspire-lean-mcp-compact` on `slow-redis` luna, both in this round. The
  guard runs on the lean arms because no `slow-redis` task exists for the no-skill MCP arms and a no-skill MCP arm is
  at the floor there (`aspire-skills-mcp` 0/6 in `t01b` and `t17-copilot`); the route the guard protects (step 3 at the
  cache) comes from `aspire-diagnose`. T1.4 guarded the same way.
- **Characters read** = per-trial `tool_result_content_chars` (everything tools returned to the model, as Copilot CLI
  delivered it), as T1.5 and T2.10 used it. **Gate:** compact2's cell median at least 30 % below the control's, in each of
  the four cells. **Ceiling, stated before the run:** in `t14`'s `aspire-mcp-compact` cells the two tools made up 12 %
  (`slow-sql` luna), 12 % (`slow-sql` terra), 22 % (`read-only` luna) and 25 % (`read-only` terra) of that measure, so the
  gate is out of reach unless the agents' other reading changes. Put to the coordinating session on 2026-11-18 with the
  alternative of gating on MCP content only (`mcp_result_content_chars`, new in `collect.py`: the MCP tools' share of the
  same measure, where the two tools were 26 % to 49 %). Until it rules, the total decides and the MCP-only figure is
  reported, not decisive; a ruling made before any `t21` result is read is recorded here with its date.
  **Note (2026-11-19):** the coordinating session ruled for (b) before the round finished; the message arrived after the results were read. Under (b) the verdict would be revise on one cell (terra `slow-sql` −35 %), and the guard (2/6 against 4/6) fails under both readings, so the action is the same: the patch is not proposed.
- **Time does not regress:** in no cell is compact2's median agent seconds higher than the control's with exact two-sided
  Mann-Whitney p < 0.05 (`stats.py`, every graded trial).
- **Verdict.** Ship: gate met in all four cells, no regression, guard holds. Revise: gate met in one to three cells, or met
  everywhere with the guard failing. Drop: gate met in no cell, or time regresses in a luna cell. A pass-rate loss of more
  than one trial in any cell is reported next to the verdict.
- **Guard:** `aspire-lean-mcp-compact2` passes at least `aspire-lean-mcp-compact`'s count minus one. If the control itself
  passes 0 or 1 of 6, the guard is read on whether the compact2 trials ran the cache's own tool (`redis-cli`) at least as
  often as the control's, and the verdict says so.
- **Mechanism, reported with the verdict (F31):** per arm and tool, calls, content characters, results over the 20 KB
  spill threshold and spill-file reads (`tools/mcp_payloads.py`); how often agents asked for `details` and used
  `limit`/`severity`; byte counts of each tool on the started Bingo app before and after
  (`evidence/agent-surface/2026-11-18-mcp/`).
- A trial that reaches the 900 s limit or fails with model-service 5xx is an infrastructure failure and is re-run once.

#### T2.1 results

**Verdict: drop, by the rule as computed at read time. Under the coordinating session's metric ruling (MCP-tool content chars; sent before the results existed, received after they were read) the reading is revise on one cell (terra `slow-sql` −35 %); the guard fails under both, so the patch is not proposed either way.**

No cell met the gate (characters read in total ≥ 30 % lower) and the guard failed. **Note:** the coordinating session ruled for (b) before the round finished; the message arrived after the results were read. Under (b) the verdict would be revise on one cell (terra `slow-sql` −35 %), and the guard (2/6 against 4/6) fails under both readings, so the action is the same: the patch is not proposed. The ruling (gate on MCP-tool content characters, ≥ 30 % in all four cells; the
precedent total, input tokens and the count of results over 20 KB reported beside it) answered alternative (b), which this
lane put to the coordinating session on 2026-11-18 before the run; under it the gate is met in one cell (terra `slow-sql`
−35 %; luna `slow-sql` −4 %, luna `read-only` −25 %, terra `read-only` −19 %). Nothing was re-run; the time clause holds (no
regression).

**Round `t21`** (Copilot CLI 1.0.99, 90 trials, 2026-11-19), tasks `b3c1f0d` for the new arms, earlier graphs for the
controls (patch alone differs, see the rule). Gates `gate-t21` 6/6 reward 1 (`2026111918349402`…`18361706`). 90 of 90
graded; no 900 s hit, no model-service 5xx, no exclusion.

| Scenario | Model | Arm | Pass | Time | ÷ raw | Input tokens | Chars read | MCP chars | MCP calls | $/trial | Run IDs |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| slow-sql | luna | raw | 6/6 | 110 | 1.00× | 459k | 89k | 0 | 0 | 0.014 | `2026111919328460`…`332562` |
| slow-sql | luna | aspire-mcp-compact | 6/6 | 125 | 1.14× | 618k | 123k | 56k | 10 | 0.019 | `2026111919124288`…`128364` |
| slow-sql | luna | aspire-mcp-compact2 | 6/6 | 166 | 1.51× | 968k | 136k | 54k | 14.5 | 0.022 | `2026111919108980`…`113042` |
| slow-sql | terra | raw | 6/6 | 55 | 1.00× | 189k | 53k | 0 | 0 | 0.056 | `2026111919359684`…`364190` |
| slow-sql | terra | aspire-mcp-compact | 6/6 | 54 | 0.98× | 253k | 96k | 50k | 6 | 0.075 | `2026111919179044`…`182610` |
| slow-sql | terra | aspire-mcp-compact2 | 6/6 | 58 | 1.05× | 268k | 74k | 33k | 6.5 | 0.070 | `2026111919170954`…`174560` |
| read-only | luna | raw | 6/6 | 97 | 1.00× | 429k | 75k | 0 | 0 | 0.014 | `2026111919344006`…`348102` |
| read-only | luna | aspire-mcp-compact | 6/6 | 98 | 1.01× | 696k | 133k | 67k | 11.5 | 0.018 | `2026111919154938`…`159576` |
| read-only | luna | aspire-mcp-compact2 | 6/6 | 118 | 1.22× | 718k | 105k | 50k | 12.5 | 0.018 | `2026111919139392`…`143140` |
| read-only | terra | raw | 6/6 | 54 | 1.00× | 197k | 58k | 0 | 0 | 0.059 | `2026111919390280`…`394038` |
| read-only | terra | aspire-mcp-compact | 6/6 | 51 | 0.94× | 342k | 94k | 68k | 10.5 | 0.080 | `2026111919203380`…`207190` |
| read-only | terra | aspire-mcp-compact2 | 6/6 | 49 | 0.91× | 307k | 79k | 55k | 10.5 | 0.077 | `2026111919187476`…`191770` |
| slow-redis | luna | raw | 0/6 | 236 | 1.00× | 525k | 87k | 0 | 0 | 0.018 | `2026111919404394`…`408440` |
| slow-redis | luna | aspire-lean-mcp-compact | 4/6 | 141 | 0.60× | 745k | 126k | 63k | 11.5 | 0.020 | `2026111919227988`…`232188` |
| slow-redis | luna | aspire-lean-mcp-compact2 | 2/6 | 189 | 0.80× | 893k | 107k | 35k | 9.5 | 0.022 | `2026111919219720`…`223292` |

Time = agent seconds, median; chars read = `tool_result_content_chars`; MCP chars = `mcp_result_content_chars`
(both median per trial).

**Patch against its control** (exact two-sided Mann-Whitney, n = 6 vs 6, `tools/p2mcp_decide.py t21`):

| Scenario | Model | Chars read | p | MCP chars | Time | p | Input tokens | p | Pass |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| slow-sql | luna | +11 % | 0.24 | −4 % | +33 % | 0.49 | +57 % | 0.59 | 6/6 vs 6/6 |
| slow-sql | terra | −23 % | 0.015 | −35 % | +7 % | 0.18 | +6 % | 0.59 | 6/6 vs 6/6 |
| read-only | luna | −21 % | 0.009 | −25 % | +20 % | 0.065 | +3 % | 1.00 | 6/6 vs 6/6 |
| read-only | terra | −16 % | 0.026 | −19 % | −4 % | 1.00 | −10 % | 0.39 | 6/6 vs 6/6 |

No time regression by the rule (no cell slower with p < 0.05); luna is slower in both cells, not significantly.

**Guard: fails.** `aspire-lean-mcp-compact2` 2/6 against `aspire-lean-mcp-compact` 4/6 (needs ≥ 3). Every one of the
12 trials ran `redis-cli` and read `SLOWLOG` or `CLIENT LIST`; the four compact2 failures ended at 393 to 705 ms against
the 300 ms limit (control failures 665 and 819 ms). All six failing trials, in both arms, reached the cache and then
patched the application instead of stopping the exporter; two of the four compact2 failures had killed the exporter's
Redis client (`CLIENT KILL`), which reconnects (`2026111919221196`, `…222588`). That is the failure T2.10 recorded, and it
looks the same in both arms; nothing in the trajectories points at the compact shape (`…221196` used the CLI for the whole
dependency step). At 2/6 against 4/6 the difference itself is not significant (Fisher p = 0.57).

**Mechanism, against F31.**
1. **Neither tool crossed the 20 KB spill threshold in either arm.** 0 of 74 `list_resources` and 0 of 51
   `list_console_logs` results were spilled with compact2, and none with patch 0001. In the trials, console-log results had a
   per-cell median of 0.1k to 3.8k characters (agents pass `search` or name a quiet resource), well under the 34.7 KB that the
   probe's unfiltered `boardadmin` call returns. The spills that remain are `list_structured_logs` (patch 0001's shape,
   5 to 8 per `read-only` cell in both arms). So the patch works only on what already went into the context whole.
2. **`list_resources` shrank, and agents asked for more.** Median per call 10,321 → 1,360 (`{}`), 491 for one resource,
   2,252 in `read-only`; 26 of 74 calls asked for `details` (10.3k back) and 25 named one resource. Luna `slow-sql` made
   25 calls against 13. `limit` appeared on all 51 `list_console_logs` calls and `severity` on 22, so the new schema
   was read and used.
3. **Net: MCP content fell 4 % to 35 %, the total 16 % to 23 % in three cells**, and luna `slow-sql` read more in total
   (+11 %): more `list_resources` and console calls, and more file reads. The share the two tools held (12 % to 25 % of
   the total in `t14`) set the ceiling, as stated before the run.
4. The schema grew by 781 bytes (`tools/list` 10,624 → 11,405), paid on every model call (T2.7 prices that at about
   0.2 tokens per byte).

**Tool results over the 20 KB spill threshold, every MCP tool, per cell** (`tools/mcp_payloads.py --round t21,t21-t27`;
calls / spilled, which tools spilled):

| Scenario | Model | compact2 (T2.1) | compact (0001) | tools8 (T2.7) | src (control) |
|---|---|---|---|---|---|
| slow-sql | luna | 90 / 1 (structured logs 1) | 65 / 2 (structured logs 1, traces 1) | 60 / 31 (traces 23, structured logs 7, console 1) | 69 / 23 (traces 18, structured logs 5) |
| slow-sql | terra | 40 / 0 | 37 / 1 (traces 1) | | |
| read-only | luna | 81 / 8 (structured logs 8) | 69 / 8 (structured logs 7, traces 1) | 64 / 20 (structured logs 9, traces 7, console 4) | 75 / 21 (structured logs 17, console 3, traces 1) |
| read-only | terra | 60 / 5 (structured logs 5) | 64 / 6 (structured logs 6) | | |
| slow-redis | luna (lean) | 51 / 0 | 67 / 1 (structured logs 1) | 14 / 3 (traces 3) | 34 / 7 (traces 7) |

In the three luna cells where both exist, patch 0001's arms spilled 11 times against the unpatched server's 51; compact2's
spilled 9, none of them from its two tools. The unpatched server's `list_console_logs` did spill (3 and 4 times in the luna
`read-only` cells); patch 0001 does not change that tool, so its absence from the 0001 arms' spills reflects what the
agents asked for, not the tool.

Byte counts on the started app: [`evidence/agent-surface/2026-11-18-mcp/`](evidence/agent-surface/2026-11-18-mcp/README.md).

**Cost.** $3.50 for `t21` (54 card trials plus the 6 control trials of the guard and 30 `raw`), against the card's $2.00.

### T2.2 Blocking start that prints endpoints

| | |
|---|---|
| Hypothesis | The cold-start gap (15% to 56%) is the start / wait / describe sequence, not the AppHost's start time |
| Change | `aspire start --wait [<resources>]` (or a default when `--non-interactive`) that returns when the named resources are healthy and prints their URLs; nothing else |
| Cells | `cold-start` × luna, terra, `gpt-6.2-sol` × 6, `aspire-cli-src` (no skill, patched) vs `aspire-cli-src`; and `aspire-lean-start` with the skill rewritten to one command |
| Decision rule | Ship if the no-skill arm closes at least half the gap to raw on all three models. Also report the warm start from T0.1 |
| Trials / cost | 3 × 3 × 6 = 54 ≈ $3.60 |
| Issue draft | [aspire-start-blocking.md](../upstream-issues/aspire-start-blocking.md) |
| Results | **drop** (2026-11-19, round `t22`, 162 trials with T2.9, $7.52): the blocking start closed none of the gap to raw on any model (luna 41.2 vs 40.2 s, terra 43.1 vs 38.6 s, sol 40.2 vs 39.8 s; raw 29.0 / 26.7 / 31.3 s). From the start command, every Aspire arm takes 33–38 s to a healthy app, blocking or not, against raw's 22 s: the gap is the AppHost launch (15–20 s) and resource start-up, not the start/wait/describe sequence. [Results](#t22-results) |

#### T2.2 rule, as computed (written 2026-11-19, before any `t22` result was read)

- **Patch** `common/aspire-patches/cli-start-wait.patch` (`aspire start` only, `StartCommand.cs`): after the
  AppHost starts, wait for resources to be healthy with the same backchannel wait `aspire wait` and the MCP
  `wait_for_resources` tool use (one 120 s budget), then print one line per resource (`Resource '<name>' is
  healthy. (<s>s)`, `… finished (exit code 0)` for a resource that runs to completion, or its state and a pointer
  to `aspire logs` when it is not ready) and an `Endpoints:` list (each resource's non-internal URLs, as
  `describe` shows them). `--wait` with no names waits for every visible resource except parameters; `--wait a b`
  for the named ones. **It is the default under `--non-interactive`** (not with `--format Json`), so the
  README's own start line blocks; `--no-wait` keeps today's behaviour. The exit code is non-zero when a resource
  is not ready; the AppHost keeps running. Built on branch `sebros/p2-start-wait` of the local Aspire checkout.
  Locally (`cold-start`, warm build cache) the start returned in 15 s with all seven resources ready.
- **Source builds need the official bundle on cold start.** A source-built CLI has no DCP/dashboard bundle
  (`aspire setup` exists only in bundle builds), and on `cold-start` the agent's own `aspire start` builds the
  AppHost, which asks the CLI on PATH for that bundle and fails (`ASPIRE009`). No `-src` arm had run on
  `cold-start` before. `entrypoint.sh` therefore replaces `aspire` on PATH, in cold-start images with a source
  CLI only, with `common/bench/aspire-source-shim.sh`: it sets `AspireCliBundlePath` to the official daily's
  layout (extracting it on first use with `/usr/local/aspire/aspire setup`, ≈ 1.4 s, as the daily does on its
  first start) and execs the source CLI. Control and patched arms get the same shim; official images are
  unchanged; existing tasks keep their suite pin.
- **Cells**, round `t22`, Copilot CLI 1.0.99, `cold-start` × luna, terra, `gpt-6.2-sol` × 6: `raw`,
  `aspire-cli-src` (no skill, unpatched source build) and `aspire-cli-wait` (no skill, patched). With them in
  the same round: `aspire-lean-start-wait` (lean + `aspire-start` rewritten to one `aspire start
  --non-interactive --wait`, skill set `lean-start-wait`, patched) and T2.9's four official arms. Secondary,
  luna × 6 only: `aspire-lean-noorch-agents-v3` (T2.11's winner with `lean-noorch-v3.md`, whose "Run it" is the
  one `--wait` command, 1,062 B; patched) against `aspire-lean-noorch-agents-src` (v2 file, unpatched source
  build: same build) and `aspire-lean-noorch-agents` (v2, official: the T2.11 arm).
- **Measure:** `seconds_to_verified_up` (T2.11's definition). The patched start's `Resource '<name>' is healthy.`
  lines are wait evidence under the existing reader, so a blocking start that reports both `bingoboard` and
  `boardadmin` is the verified-up point. Medians over graded trials, same round.
- **Gap and closure per model,** from the same-round `t22` cells only (`t16`'s figures are reported beside them, not
  used): G = median(`aspire-cli-src`) − median(`raw`); closed = median(`aspire-cli-src`) − median(`aspire-cli-wait`).
  The model's clause holds if closed ≥ G / 2. **Where G ≤ 0** (no gap to close; `t16` sol had raw 41.5 s against
  `aspire-cli` 40.4 s), the clause is "`aspire-cli-wait` ≤ `aspire-cli-src` on seconds to verified-up" (no
  regression). On every model, also: `aspire-cli-wait` passes ≥ `aspire-cli-src`'s count minus one. Both
  definitions agreed with the coordinating session on 2026-11-19, before any `t22` result.
- **`ship`** if the clause holds on all three models; **`revise`** if on one or two (named); **`drop`** if on none.
  p (exact two-sided Mann-Whitney, `aspire-cli-wait` vs `aspire-cli-src`) is reported, not in the rule.
- **Reported whatever the verdict:** `agent_seconds`, `commands_to_verified_up` and tokens per arm; T2.11's phase
  split (model time before the start command / start command / waits / after) for raw, `-src`, `-wait`; how many
  patched trials still ran `aspire wait` or `aspire describe` after the start, and how many saw the start come
  back unfinished (Copilot's shell returns after `initial_wait`, 30 s in a third of earlier sol starts, and sol
  ran the start detached in 14 of 37); `aspire-lean-start-wait` against `aspire-cli-wait` (same build) and against
  same-round official `aspire-lean-start` (build differs: managed single-file vs NativeAOT); the v3 reading
  against the `-src` v2 arm; the warm start from T0.1 (`t01b-warm`, luna, 3 trials: verified-up 34.5 s against
  `t01b` cold 49.0 s, `aspire-lean`).
- **No guard cells:** the patch changes `aspire start` only, and on `slow-sql` and `slow-redis` the app is
  running when the agent begins (no trial at the pin started it). Any `aspire start` in this lane's guard
  scenarios is counted.
- A trial at the 900 s limit is a failure counted separately; a trial lost before the agent ran is re-run once.
  Expected spend for `t22` (T2.2 + T2.9, 162 trials): ≈ $8.7 (sol ≈ 48 × $0.15), against $4.80 on the two cards.

#### T2.2 results

**Verdict: `drop`**, by the rule as computed: the clause holds on no model. Same-round medians to verified-up:

| Model | `raw` | `aspire-cli-src` | `aspire-cli-wait` | G | Closed | Needed (G / 2) | p (`-wait` vs `-src`) |
|---|---:|---:|---:|---:|---:|---:|---:|
| luna | 29.0 s | 40.2 s | 41.2 s | 11.2 s | −1.0 s | 5.6 s | 0.49 |
| terra | 26.7 s | 38.6 s | 43.1 s | 11.9 s | −4.5 s | 6.0 s | 0.002 (slower) |
| sol | 31.3 s | 39.8 s | 40.2 s | 8.5 s | −0.4 s | 4.3 s | 0.55 |

Every model had a gap in this round (G > 0), so the no-gap clause did not apply. Pass rates are 6/6 on every arm.
`t16`'s figures, for reference only: raw 33.3 / 28.8 / 41.5 s and `aspire-cli` 41.3 / 39.8 / 40.4 s (luna / terra /
sol); `t16` sol's missing gap was not reproduced. Warm start (T0.1, `t01b-warm`, luna, 3 trials): 34.5 s to
verified-up against 49.0 s cold (`aspire-lean`, `t01b`).

Round `t22` (Copilot CLI 1.0.99, suite `e165626`, tasks `672b69b`, dataset `40a1dac`), 162 trials: no timeouts, no
model-service 5xx, no infrastructure losses, every trial passed. Gates: local cold-start fail → agent start →
pass on the patched image (before Docker Desktop stopped on a full disk), then the control's start through the
shim; `gate-t22` 6/6 and `gate-t23` 9/9 reward 1; probe `t22-probe` (2026111919040184 luna, 2026111919043896 sol,
excluded) showed the start returning in one call on luna and unfinished at sol's 30 s shell wait, with the metric
firing in both. Extracted runs were deleted and re-fetched after other lanes' collects had run; 0 of 282 rows changed.

| Model | Arm (`cold-start`, `t22`) | Pass | Verified-up s | Commands to it | `agent_seconds` | Tokens (k) | Run IDs |
|---|---|---|---:|---:|---:|---:|---|
| luna | raw | 6/6 | 29.0 | 3 | 39.3 | 56 | 2026111919703508 – 19707340 |
| luna | aspire-cli-src | 6/6 | 40.2 | 5.5 | 51.1 | 75 | 2026111919712150 – 19715724 |
| luna | **aspire-cli-wait** | 6/6 | 41.2 | 5 | 51.4 | 72 | 2026111919720560 – 19724308 |
| luna | aspire-lean-start-wait | 6/6 | 40.8 | 6 | 51.8 | 85 | 2026111919736568 – 19740042 |
| luna | aspire-lean-noorch-agents (v2, official) | 6/6 | 38.9 | 6 | 50.0 | 90 | 2026111920002126 – 20005910 |
| luna | aspire-lean-noorch-agents-src (v2) | 6/6 | 37.8 | 7 | 46.5 | 89 | 2026111920017262 – 20021162 |
| luna | aspire-lean-noorch-agents-v3 | 6/6 | 41.8 | 3.5 | 51.8 | 58 | 2026111920031972 – 20035608 |
| terra | raw | 6/6 | 26.7 | 3 | 34.9 | 51 | 2026111919790138 – 19794158 |
| terra | aspire-cli-src | 6/6 | 38.6 | 5 | 50.9 | 72 | 2026111919805508 – 19809598 |
| terra | **aspire-cli-wait** | 6/6 | 43.1 | 3 | 54.8 | 49 | 2026111919820842 – 19824654 |
| terra | aspire-lean-start-wait | 6/6 | 39.9 | 4 | 49.6 | 70 | 2026111919829340 – 19832534 |
| sol | raw | 6/6 | 31.3 | 8.5 | 39.7 | 102 | 2026111919883992 – 19887306 |
| sol | aspire-cli-src | 6/6 | 39.8 | 5 | 51.2 | 83 | 2026111919891642 – 19895020 |
| sol | **aspire-cli-wait** | 6/6 | 40.2 | 6 | 51.6 | 91 | 2026111919899698 – 19903656 |
| sol | aspire-lean-start-wait | 6/6 | 41.5 | 4.5 | 50.5 | 91 | 2026111919915086 – 19919470 |

**Mechanisms.**
- **The gap is Aspire's own time to a healthy app, not the command sequence.** Per trial, from the moment the
  start command is invoked to verified-up: raw 22.4 / 21.7 s (luna / terra; sol 22–25 s), every Aspire arm
  33–38 s, blocking or not (luna `-src` 35.0 s with the start finished in the call, `-wait` 35.6 s; terra 34.2 and
  38.0 s; sol `-src` 37.0 s finished / 33.9 s unfinished, `-wait` 36.9 s, every patched sol start coming back
  unfinished at its 30 s shell wait). Inside the
  patched start's own output, the AppHost launch until the backchannel answers took 15–20 s and the resources
  14–19 s more (medians per cell); the 16–17 s the control's `aspire start` takes is the same launch. The launch
  (AppHost build, DCP, dashboard) is not broken down further here. A blocking start folds the waits into one call,
  but the waits had run while the app was starting anyway, so nothing is saved. **T2.11's attribution** ("`aspire
  start` returning before health, plus the waits") is therefore wrong: what is left against raw is the time the
  AppHost takes to launch and its resources to become healthy.
- **The blocking start is 0.6–3.8 s slower** than start plus waits in every same-build pair (luna 35.6 vs 35.0 s,
  terra 38.0 vs 34.2 s, luna v3 35.7 vs 33.3 s from invocation). The cause was not identified; candidates are
  waiting on all seven resources rather than the two the agents waited on, and the second snapshot read.
- **Agents re-check anyway.** Terra ran `aspire wait` after a blocking start that had already reported both
  resources healthy in 6/6 trials (luna 2/6, sol 6/6 after its unfinished starts), because the README names the
  waits; `aspire describe` after the start ran in 1/6, 4/6 and 4/6 (luna / terra / sol). The patched start came
  back unfinished at Copilot's shell wait in 3/6 luna, 0/6 terra and 6/6 sol trials. The pre-registered phase split
  (before / start / waits / after, T2.11) is replaced here by the time from the start command to verified-up, split
  by finished and unfinished starts, because medians of phases mix trials whose start blocked with trials whose
  start returned early. Commands to verified-up fell (terra 5 → 3) and tokens fell on terra (72k → 49k), but time did not.
- **One command in the skill or the file does not help either.** `aspire-lean-start-wait` against `aspire-cli-wait`
  (same build) is 0.99× / 0.93× / 1.03× (luna / terra / sol; p ≥ 0.14), and against official `aspire-lean-start`
  1.04× / 1.04× / 1.05× (build differs). File v3 against v2 on the same build (luna): 1.10× slower (41.8 vs 37.8 s,
  p = 0.045), with 0.65× the tokens and 3.5 commands against 7.
- **No guard cells ran** (pre-registered: the change touches `aspire start` only, which no `slow-sql` or
  `slow-redis` trial at the pin ran).

**Cost** `t22` $7.52 for 162 trials (sol $0.127 per trial, 48 trials $6.08), probes $0.08, gates $0.00; the two cards
estimated $4.80 (T2.2 $3.60 and T2.9 $1.20), the pre-round estimate was $8.70.

### T2.3 SQL text in the trace detail table

| | |
|---|---|
| Hypothesis | The skill sends agents to JSON for one trace only because the table omits `db.query.text`; with it, step 2 becomes one bounded table read |
| Change | `aspire otel traces -t <id>` table gains a truncated statement/URL column |
| Cells | `slow-sql` × luna, terra × 6, `aspire-lean-src` patched vs unpatched; guard `slow-redis` luna × 6 on both |
| Decision rule | Ship if characters read drop and time to root cause does not rise; drop if agents still go to JSON (the table is then not the issue) |
| Trials / cost | 2 × 2 × 6 = 24 + 12 guard = 36 ≈ $1.20 |
| Results | **revise** by the rule, no revision proposed (2026-11-19, round `t23`, 120 trials with T2.4, $5.85): agents left JSON (tree 6/6, JSON 1/6 luna, 0/6 terra), but characters read rose (+5 %, +8 %), time to root cause was 1.17× (p = 0.002) and 1.15×, and the `slow-redis` guard passed 4/6 against 6/6. One trace read is under 5 % of a trial, so its 63 % cut cannot move the total. [Results](#t23-results) |

#### T2.3 rule, as computed (written 2026-11-19, before any `t23` result was read)

- **Patch** `common/aspire-patches/cli-trace-detail.patch` (`TelemetryTracesCommand.cs`): in `aspire otel
  traces -t <id>`'s span tree, each span that carries `db.query.text`, `db.statement`, `url.full` or `http.url`
  gets one dimmed line under it with that value, whitespace collapsed, cut at 160 characters. Nothing else
  changes (the JSON is byte-identical). Branch `sebros/p2-trace-sql`. Locally, redirected: the 1.57 s `postgresql`
  span of an import trace now shows `UPDATE "BingoSquares" SET "Label" = @p0, …`.
- **The skill moves with it.** `aspire-diagnose` step 2 says "Use JSON here, not the table: only JSON carries …
  `db.query.text`": with the skill unchanged, every agent goes to JSON by construction (12/12 luna and 12/12 terra
  `slow-sql` lean trials at the pin fetched the trace as JSON). The patched arm therefore gets skill set
  `lean-tracetable`: lean with step 2 rewritten to `aspire otel traces -t <trace-id>` ("the tree lists every span
  … and under each database or HTTP client span the statement or URL it ran"; JSON only for attributes the tree
  does not show). The comparison is the product change plus the skill line it allows, against today's pair.
- **Cells**, round `t23`, Copilot CLI: `slow-sql` × luna, terra × 6, `aspire-lean-src` (unpatched source build,
  lean; existing task) vs `aspire-lean-tracetable` (patched + revised step 2); guard `slow-redis` luna × 6 on
  both (new tasks); `raw` on `slow-sql` and `slow-redis` × luna, terra × 6 in the same run (series).
- **Measures:** characters read = `tool_result_content_chars`; time to root cause = `seconds_to_root_cause_seen`
  (`square_audit` on screen: the trigger's table, which no trace span carries, so the metric does not fire on the
  new tree line); new `collect.py` fields `trace_detail_json` / `trace_detail_table` (shell calls that fetch one
  trace by `-t`/`--trace-id`, with and without `--format json`). If a trial's `seconds_to_root_cause_seen` is
  missing or fired on an `rg` for the SQL text, its time to root cause is read from the trajectory and listed.
- **`drop`** if agents still go to JSON: on either model, ≥ 4 of 6 patched trials fetch a trace as JSON.
- **`ship`** otherwise, if on both models median characters read are lower than the control's and median time to
  root cause is ≤ 1.10 × the control's, and the guard holds (`slow-redis` luna passes ≥ control − 1).
- **`revise`** otherwise, naming the failed clause. p values are reported, not in the rule.

#### T2.3 results

**Verdict: `revise`**, as the rule computes, but **no revision follows from the data, and the patch is not
proposed.** It achieved its mechanism without the outcome: agents left JSON, yet nothing they were measured on
improved. Why: one trace read is under 5 % of a trial's characters, so cutting that read by 63 % cannot move the
total, and the time to root cause is spent elsewhere. That is the finding (ruling of the coordinating session,
2026-11-19, consistent with the user's T1.4 ruling that pre-registered rules stand).

Agents left JSON. With the statement under each span and step 2 pointing at the tree,
every patched trial read the tree (6/6 on both models); JSON for one trace fell from 6/6 to 1/6 on luna and 0/6 on
terra, so the drop clause ("still go to JSON") does not fire. Every ship clause failed:
- characters read rose on both models (luna 71.9k against 68.3k, p = 0.82; terra 61.0k against 56.6k, p = 1.0);
- time to root cause rose beyond the 1.10 bar on both (luna 24.0 against 20.5 s, 1.17×, p = 0.002; terra 22.6
  against 19.6 s, 1.15×, p = 0.082);
- the guard failed: `slow-redis` luna passed 4/6 against the control's 6/6 (the bar was 5/6). That cell passed 4/6,
  4/6, 5/6 and 5/6 in four earlier rounds at this pin, and both misses are luna's known exporter-left-running mode
  (below), not a new failure.

Round `t23` (suite `e165626`, tasks `672b69b`; the `slow-sql` control `aspire-lean-src` is the existing task on
tasks `1479041e` / suite `305a8ed`; between that suite and `e165626` the common files changed only additively
and off the `slow-sql` path: the stuck-db fault, the selection hooks, the cold-start shim, the patches; its lean
skill fingerprint `a14396de6b87` equals the new tasks'), Copilot CLI,
120 trials for T2.3 and T2.4 together, $5.85: no timeouts, no model-service 5xx, no infrastructure losses.
Extracted runs were deleted and re-fetched after other lanes' collects; 0 of 282 rows changed.

| Scenario | Model | Arm (`t23`) | Pass | Root cause seen s | Redis reply s (trials) | `agent_seconds` | Chars read (k) | Trace by ID: JSON / tree | Run IDs |
|---|---|---|---|---:|---|---:|---:|---|---|
| slow-sql | luna | raw | 6/6 | 23.7 | n/a | 104.7 | 87.7 | 0 / 0 | 2026111920969076 – 20972978 |
| slow-sql | luna | aspire-lean-src | 6/6 | 20.5 | n/a | 113.2 | 68.3 | 6 / 0 | 2026111920890286 – 20894188 |
| slow-sql | luna | aspire-lean-tracetable | 6/6 | 24.0 | n/a | 110.6 | 71.9 | 1 / 6 | 2026111920898788 – 20902418 |
| slow-sql | luna | aspire-cli-src | 6/6 | 61.8 | n/a | 135.8 | 119.6 | 0 / 0 | 2026111921091972 – 21095376 |
| slow-sql | luna | aspire-cli-redishint | 4/6 | 55.1 | n/a | 117.8 | 122.8 | 1 / 0 | 2026111921100058 – 21103668 |
| slow-sql | terra | raw | 6/6 | 12.1 | n/a | 52.9 | 53.5 | 0 / 0 | 2026111921045966 – 21049610 |
| slow-sql | terra | aspire-lean-src | 6/6 | 19.6 | n/a | 56.6 | 56.6 | 6 / 0 | 2026111920986310 – 20990430 |
| slow-sql | terra | aspire-lean-tracetable | 6/6 | 22.6 | n/a | 61.6 | 61.0 | 0 / 6 | 2026111921002490 – 21006522 |
| slow-redis | luna | raw | 0/6 | 18.1 | 32.7 (5/6), first failed 0 | 223.3 | 99.2 | 0 / 0 | 2026111920977886 – 20981464 |
| slow-redis | luna | aspire-lean-src | 6/6 | 30.1 | 30.1 (6/6), first failed 0 | 107.2 | 107.2 | 6 / 0 | 2026111921076168 – 21079534 |
| slow-redis | luna | aspire-lean-tracetable | 4/6 | 34.6 | 32.0 (6/6), first failed 0 | 119.2 | 102.4 | 3 / 6 | 2026111921084140 – 21087426 |
| slow-redis | luna | aspire-cli-src | 0/6 | 7.7 | 90.8 (1/6), first failed 2 | 179.2 | 118.1 | 1 / 0 | 2026111920907140 – 20911206 |
| slow-redis | luna | aspire-cli-redishint | 0/6 | 6.9 | 65.0 (3/6), first failed 0 | 131.9 | 141.4 | 1 / 0 | 2026111920922688 – 20926204 |
| slow-redis | luna | aspire-skills-src | 0/6 | 11.4 | 92.5 (1/6), first failed 2 | 134.2 | 120.2 | 0 / 0 | 2026111920930810 – 20934366 |
| slow-redis | luna | aspire-skills-redishint | 0/6 | 23.5 | – (0/6), first failed 0 | 147.8 | 123.4 | 2 / 0 | 2026111920938970 – 20942850 |
| slow-redis | terra | raw | 6/6 | 3.2 | 7.8 (6/6), first failed 0 | 183.8 | 53.0 | 0 / 0 | 2026111921061306 – 21065230 |
| slow-redis | terra | aspire-cli-src | 6/6 | 3.0 | 21.6 (6/6), first failed 0 | 168.0 | 78.4 | 0 / 0 | 2026111921011344 – 21015152 |
| slow-redis | terra | aspire-cli-redishint | 6/6 | 3.0 | 15.5 (6/6), first failed 1 | 137.1 | 84.4 | 1 / 0 | 2026111921020976 – 21025034 |
| slow-redis | terra | aspire-skills-src | 6/6 | 3.1 | 24.2 (6/6), first failed 3 | 161.7 | 90.7 | 0 / 0 | 2026111921029862 – 21033368 |
| slow-redis | terra | aspire-skills-redishint | 6/6 | 16.1 | 28.2 (6/6), first failed 2 | 132.2 | 84.0 | 0 / 0 | 2026111921037876 – 21041450 |

**Mechanisms.**
- **The tree replaces the JSON read where it is used.** One trace fetched by ID is 1,269 characters as the tree
  against 3,393 as JSON (−63 %), but that read is under 5 % of a trial's 60–70k characters, so the trial totals
  move with everything else the agent reads.
- **The extra time to root cause is not in the trace step.** From the trace read to the first database command:
  luna 12.1 against 11.0 s, terra 3.9 against 5.3 s, with code reads in between of luna 1–8 (median 6) against 3–7
  (median 4.5) and terra 0–1 against 0. The difference sits after the first database command and is not explained;
  the arm also changed the skill's step 2 text (which no longer names `source` and `destination`) together with
  the CLI, so the two cannot be separated in this design.
- **The guard misses are the cell's known failure.** Both failed `slow-redis` trials reached Redis (33–36 s) and
  read the tree, but never stopped the exporter ("Status still takes 456–465 ms"), the same mode as T2.10's guard;
  the lean luna `slow-redis` cell passed 4/6, 4/6, 5/6 and 5/6 in four earlier rounds at this pin.

### T2.4 Redis plain port, or a hint where the agent looks

| | |
|---|---|
| Hypothesis | An agent following a generic Redis recipe loses a diagnosis cycle to the TLS-on-6379 default |
| Change | Either plain on 6379 / TLS on 6380, or `aspire describe cache --format Json` carrying a `connect` hint (`redis-cli -p 6380`) and the dashboard's terminal hint saying the same |
| Cells | `slow-redis` × luna, terra × 6, **`aspire-cli`** (no skill) patched vs `-src` control, because the skill already carries the workaround |
| Decision rule | Ship if the no-skill arm's seconds to root cause drop ≥ 20% or its pass rate rises by two trials; otherwise keep the skill note and close |
| Trials / cost | 2 × 2 × 6 = 24 ≈ $1.00 |
| Issue draft | [aspire-redis-default-ports.md](../upstream-issues/aspire-redis-default-ports.md) |
| Results | **drop** (2026-11-19, round `t23`): the `slow-sql` guard failed (4/6 against 6/6, neither miss through the hint); the time clause passed on terra by medians only (first Redis reply 15.5 against 21.6 s, p = 0.49); luna 0/6 on both arms; the shipped-set pair showed no gain. Skill note kept. [Results](#t24-results) |

#### T2.4 rule, as computed (written 2026-11-19, before any `t23` result was read)

- **Choice: the hint, not the port swap.** The swap lives in `Aspire.Hosting.Redis` (the TLS callback in
  `RedisBuilderExtensions.cs`), which the AppHost takes from NuGet; the dashboard's terminal hint ships in the
  CLI bundle. The source-build arms rebuild only `Aspire.Cli`, so the swap would need a hosting-package build
  and a NuGet-cache overlay that no lane has gated. The hint also sits where the decision arm already looks:
  11 of 12 `aspire-cli` `slow-redis` trials at the pin ran `aspire describe` before their first `redis-cli`. The
  dashboard half of the hint is out of reach for the same reason as the swap and is not measured.
- **Patch** `common/aspire-patches/cli-redis-connect-hint.patch`: for a resource whose type is Redis and whose
  container arguments carry `--tls-port X --port Y`, `aspire describe` adds to the URLs cell, and `describe
  --format Json` adds as `connect`: "Port X is TLS inside the container; a bare redis-cli fails there. Plain TCP
  is on Y: docker exec <container.id> sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli -p Y <command>'" (the
  auth prefix only when `--requirepass` is set). Read from the arguments, not hard-coded. Branch
  `sebros/p2-redis-hint`. Leak review: it says how to connect, as the lean skill's step 3 does; no command, key,
  client or fault.
  T2.6's generic `connect` object uses the same top-level field; this string is its `note` + `command` for
  Redis (cross-reference added 2026-11-19 at the integrations lane's request; different arms and rounds, no pooling).
- **Before the run, from the pin's trajectories:** in the decision arm the trap is rare. A bare `redis-cli`
  failed first in 1 of 6 terra `aspire-cli` trials; luna reached `redis-cli` in 1 of 6 (it edits code, 0/6 pass in
  `t01b`). Terra learns port 6380 from the `ps` listing of the container's `redis-server` arguments. Where the
  trap does fire is the shipped set without MCP (`aspire-skills`: first `redis-cli` failed in 5 of 12 luna and 2 of
  6 terra trials) and with MCP (sol 6/6). A small effect in the decision arm is therefore expected and is not a
  reason to re-run.
- **Measure.** `seconds_to_root_cause_seen` is unusable on `slow-redis`: it fires on any result that names
  `report-exporter`, including the opening `ps` listing (terra `aspire-cli` median 4.3 s). The time measure is
  therefore a new `collect.py` field, `seconds_to_redis_reply`: from the first trajectory event to the completion of
  the first tool call whose command runs `redis-cli` and whose result is a reply from the server, not an error
  (non-empty output with none of `I/O error`, `Connection reset`, `Could not connect`, `Connection refused`,
  `NOAUTH`, `WRONGPASS`, `wrong version number`, `Server closed`, `Protocol error`); with `redis_cli_first_failed`
  (the first `redis-cli` call returned such an error). Back-filled over every `slow-redis` trial already collected.
  `seconds_to_first_fix` (stopping the exporter) is reported.
- **Cells**, round `t23`: `slow-redis` × luna, terra × 6, `aspire-cli-src` (no skill, unpatched) vs
  `aspire-cli-redishint` (no skill, patched). The hint changes what `describe` shows, so a guard: `slow-sql` luna
  × 6 on both.
- **`ship`** if, on luna or on terra, `aspire-cli-redishint`'s median `seconds_to_redis_reply` is ≤ 0.80 × the
  control's or it passes ≥ control + 2, and on neither model does it pass < control − 1, and the guard holds
  (`slow-sql` luna passes ≥ control − 1). Otherwise **`drop`**: keep the skill note (lean step 3) and close.
- **Secondary pair, out of the rule** (agreed with the coordinating session, ≈ $1.7): the shipped set without MCP,
  `aspire-skills-src` vs `aspire-skills-redishint`, `slow-redis` × luna, terra × 6. Motivation: the trap fires on
  the shipped set (first `redis-cli` failed in 5/12 luna and 2/6 terra `aspire-skills` trials), against 1/12 on
  `aspire-cli`. The verdict is by the card's rule on the no-skill arm alone. If the no-skill arm shows nothing and
  this pair shows a clear gain, the verdict still follows the rule, and the pair goes into the write-up as the
  finding that would motivate a re-targeted card; nothing ships on this pair alone.
- *Post-hoc note (2026-11-19, after the run):* the rule does not say how a trial without any `redis-cli` reply counts in
  the median of `seconds_to_redis_reply` (luna: 3 hinted trials with a reply against 1 control trial). It is left
  undefined here; the verdict rests on the guard.

#### T2.4 results

**Verdict: `drop`**, on the guard (ruling of the coordinating session, 2026-11-19: the rule stands): `slow-sql` luna passed 4/6 on `aspire-cli-redishint` against 6/6 on
`aspire-cli-src` (the bar was 5/6). The time clause passed on terra by medians: the first working `redis-cli` reply
came at 15.5 against 21.6 s (0.72×, p = 0.49), pass 6/6 against 6/6. On luna neither arm passed a trial (0/6 and
0/6), 3 hinted trials got a Redis reply against 1 control trial (65.0 against 90.8 s on those), and the rule did
not say how trials without a reply count.
Neither guard miss went through the hint, and the shipped-set pair showed no gain (below), so the skill note (lean
step 3) stays and the card closes.

Same round `t23` as T2.3 (table above).

**Mechanisms.**
- **Only the table half of the hint was ever seen.** Every unfiltered `aspire describe --format Json` (about 24 KB)
  came back as Copilot's 886-character preview with the output spilled to a file (F31), and agents then read the
  spill through `jq`/`grep` for the fields they wanted, which drops `connect`. The table row carries the hint and
  was read: before the first `redis-cli` the hint was on screen in 4 of 6 terra trials (all through the table; one
  other saw only the JSON preview, one ran no `describe` first) and in 2 of the 3 luna trials that ran `redis-cli`.
  Terra's first `redis-cli` still failed in 1 of 6 (the control's in 0 of 6 this round, 1 of 6 at `t01b`). The trap
  was rare in this arm, as pre-registered.
- **The guard misses did not go through the hint.** Of the two failed `slow-sql` trials, one never ran `aspire
  describe` and patched application code; the other saw no hint (its `describe` reads were a table without the Redis
  row's hint on screen, the 886-character JSON preview and a filtered JSON read) and never touched Redis. Both are
  luna's no-skill code-editing miss; the no-skill luna `slow-sql` cell passed 6/6 in `t01b` and in this round's control
  (and `aspire-cli-agents` 6/6 in `t210`).
- **The shipped-set pair (secondary, out of the rule) shows no gain.** On `aspire-skills`, where the trap fires,
  the hint was seen in 1 of 6 terra trials and 2 of 6 luna. Those agents did run `describe` (as at the pin), but as
  JSON: 5 of 6 terra trials started with `describe --format Json`, got the preview, and filtered the spill, so the
  `connect` field never reached the screen; the one terra trial that read the table saw the hint. Terra's first `redis-cli` failed in 2 of 6 against 3 of 6, its reply came at 28.2 against
  24.2 s (p = 0.70), and luna got no reply at all against 1 of 6, pass 0/6 on both. Nothing here motivates a
  re-targeted card for this hint as built. A JSON hint has to survive the preview (near the top of a short output,
  or a `describe cache` that stays under the limit) or the filters agents apply; the port swap (not measured) needs
  neither.
- **Relation to T2.6.** T2.6 shipped a generic `connect` object in `describe --format Json` (same field; this
  string is its `note` + `command` for Redis). Its agents ran `connect.command` as given in 4/6 Redis trials,
  because the lean skill's step 3 told them to look there; T2.4's no-skill agents had no such pointer.

**Cost** (T2.3 + T2.4) `t23` $5.85 for 120 trials, against the cards' $2.20 plus the approved $1.70 secondary.

### T2.5 Redis client tracing in the aspirified template

| | |
|---|---|
| Hypothesis | With the cache span in the trace, `slow-redis` becomes a `slow-sql`-shaped problem: the lean agent's 38 s to root cause drops toward 26 s and the MCP route stops losing luna to source code |
| Change | `aspireify` guidance and the Bingo aspirified template use the Aspire Redis client integration (`AddRedisDistributedCache`) so `IDistributedCache` calls emit spans |
| Cells | `slow-redis` × luna, terra × 6: `aspire-lean`, `aspire-lean-mcp-all` (traced app) vs the same arms on the untraced app; `aspire-cli` as the no-skill check |
| Decision rule | Ship if luna `aspire-lean-mcp-all` passes ≥ 5/6 and seconds to root cause drop on both lean arms |
| Companion | **Instrumented raw arm** (REPORT §12.4): the raw app with the OpenTelemetry SDK and a file exporter, no Aspire. Same cells. This is what separates "has traces" from "has `aspire otel` and a skill" |
| Trials / cost | 2 × 3 × 6 × 2 app variants = 72, plus 24 for the instrumented raw arm ≈ $4.00 |
| Issue draft | [skills-aspireify-redis-client-tracing.md](../upstream-issues/skills-aspireify-redis-client-tracing.md) |
| Results | [**revise**](#t25-results) (as computed on `t25`): the robust effect is the luna lean CLI route reaching the cache faster when traced (22 vs 39 s, replicated in `t25-span`); `t25`'s MCP pass gap (3/6 vs 6/6) did **not** replicate (5/6 vs 2/6 one round later). Span-table row: not worth proposing. $5.65 + $0.89 |

#### T2.5 rule, as computed (written 2026-11-19, before any `t25` trial)

- **The change measured.** `common/app-variants/aspire-redis-traced/` (build argument `APP_VARIANT`, both
  arms' images otherwise identical): `BingoBoard.Admin` registers its cache with
  `builder.AddRedisDistributedCache("cache")` from `Aspire.StackExchange.Redis.DistributedCaching`
  instead of `AddStackExchangeRedisCache`; nothing else in the source. The SignalR backplane keeps its
  own untraced connection. Defaults are kept, so the change also adds the integration's Redis health
  check to `boardadmin`'s `/health` and moves the app's OpenTelemetry core from 1.15.3 to 1.18.0 (the
  package requires it). The `aspireify` text change is drafted in the issue only: no skill file changes,
  so every traced arm has the same skill fingerprint as its control.
- **Instrumented raw** (`raw-otel`, `common/app-variants/raw-otel/`): the raw app with the same
  instrumentation set as the traced Aspire app (ASP.NET Core with `/health` filtered, HttpClient, Npgsql,
  StackExchange.Redis on the cache's connection), a JSON-lines file exporter (one span per line, name,
  kind, duration, attributes) at `.script-state/traces.jsonl`, and one README sentence saying so, as the
  Aspire README names `aspire otel`. No Aspire, no skill.
- **Cells**, one round `t25`, Copilot CLI 1.0.99, pin 2026-11-17, n = 6: `slow-redis` × luna, terra ×
  {`aspire-lean-traced`, `aspire-lean-mcp-all-traced`, `aspire-cli-traced`, `raw-otel`} against
  {`aspire-lean`, `aspire-lean-mcp-all`, `aspire-cli`, `raw`} re-run in the same round (96). Guard:
  `slow-sql` luna `aspire-lean-traced` vs `aspire-lean` × 6 (12), because the template change puts cache
  spans into every trace. Controls are the existing tasks (`tasks 1479041e`, suite `305a8ed`); every
  change to `common/` and the template since `305a8ed` is additive (348 insertions, 0 deletions), so a
  traced arm differs from its control by the variant only.
- **Seconds to root cause** = `seconds_to_redis_reply` from `collect.py` (T2.4's field: first `redis-cli`
  call whose result is a reply from the server), median over the trials where it fired, with the count
  fired. *Amended 2026-11-19 ~05:20 UTC, after `t25` was submitted and before any `t25` result was read:*
  the rule first named `seconds_to_root_cause_seen`, which the T2.4 lane has since shown fires on the
  opening `ps` listing on this scenario (REPORT §3.7 metrics note); on the lean arms the two fields agree at
  this pin (luna lean 38.9 vs 39.0 s, mcp-all 54.8 vs 56.0), on `raw` and `aspire-cli` they do not, so the
  companion readings would be wrong on the old field. `seconds_to_root_cause_seen` is reported beside it.
  Time = `agent_seconds`; p = exact two-sided Mann-Whitney.
- **`ship`** if all hold: (a) luna `aspire-lean-mcp-all-traced` passes ≥ 5/6; (b) on luna, the median
  seconds to root cause is lower on the traced arm than on its control for **both** `aspire-lean` and
  `aspire-lean-mcp-all` (lower median, no significance bar at n = 6; p reported); (c) guard: `slow-sql`
  luna `aspire-lean-traced` passes ≥ the control − 1 and its time ratio is ≤ 1.15. **`drop`** if (b)
  fails on both lean arms. Otherwise **`revise`**, naming the failed condition. Terra is reported, not
  gating. Note before the round: luna `aspire-lean-mcp-all` passed 6/6 at this pin (T1.4 guard), so (a)
  no longer separates the arms; (b) carries the decision.
- **Companion readings** (REPORT §12.4), reported, not gating: `raw-otel` ÷ `raw` (pass, time, seconds
  to root cause) and `aspire-lean-traced` ÷ `raw-otel`. "Traces carry most of it" if `raw-otel` closes at
  least half of the luna `raw` → `aspire-lean-traced` gap in median `agent_seconds` and passes at least as
  many trials as `aspire-lean-traced` − 1; "the CLI and skill carry it" if it closes under a quarter.
  `aspire-cli-traced` ÷ `aspire-cli` is the no-skill reading.
- **Mechanism measures**: trials that patch application code; first command after a result showing
  `HMGET` spans; trials whose `aspire otel traces -t … --format Json` result exceeded 20,000 characters
  (F31's preview cutoff; one local status trace was 19,173 bytes with 47 spans); `raw-otel` trials that
  read `traces.jsonl`. Seen in the local gate before the round, recorded and not tuned for: the traced
  status trace holds about 45 `HMGET` client spans of 120–280 ms each, which the skill's span table
  reads as "many near-identical child spans → N+1 in the caller", and their `destination` is
  `localhost:<port>`, not the resource name.
- A trial at the 900 s limit is a failure, counted separately; a trial lost before the agent ran is
  re-run once. Expected spend ≈ $5.4 (48 luna at ≈ $0.019, 48 terra at ≈ $0.09, 12 guard), against the
  card's $4.00; stop and report above $12.

#### T2.5 results

Round `t25`, 108 trials (no infrastructure failure, no timeout), Copilot CLI 1.0.99, pin 2026-11-17, tasks
`caed1af` (treatments) and `1479041e` (controls), **$5.65** against the card's $4.00 (luna $0.99, terra $4.52,
guard $0.14). Gates: local fail → repair → pass on all three new images; `gate-t25` 5/5 reward 1.

| Cell (`slow-redis` unless noted) | Pass | `agent_seconds` | Seconds to Redis reply (fired) | Trials that edited `/app/src` |
|---|---|---|---|---|
| luna `aspire-lean-traced` / `aspire-lean` | **6/6** / 5/6 | 84.8 / 128.3 (0.66×, p = 0.31) | **22.1 / 38.7** (0.57×, p = 0.10; 6 / 6) | 1 / 1 |
| luna `aspire-lean-mcp-all-traced` / `aspire-lean-mcp-all` | **3/6** / 6/6 (Fisher p = 0.18) | 160.4 / 116.2 (1.38×) | **47.7 / 34.9** (1.37×; 3 / 6) | 4 / 0 |
| luna `aspire-cli-traced` / `aspire-cli` | 2/6 / 1/6 | 134.6 / 123.8 | 27.6 / 48.8 (3 / 2) | 4 / 5 |
| luna `raw-otel` / `raw` | **0/6** / 3/6 (Fisher p = 0.18) | 127.3 / 217.7 (0.58×) | 50.5 / 27.6 (1 / 5) | 6 / 3 |
| terra `aspire-lean-traced` / `aspire-lean` | 6/6 / 6/6 | 101.2 / 66.9 (1.51×, p = 0.94) | 15.4 / 15.4 | 0 / 0 |
| terra `aspire-lean-mcp-all-traced` / `aspire-lean-mcp-all` | 6/6 / 6/6 | 48.0 / 59.0 (0.81×) | 15.8 / 17.6 | 0 / 0 |
| terra `aspire-cli-traced` / `aspire-cli` | 6/6 / 6/6 | 131.3 / 141.6 | 16.2 / 15.8 | 0 / 0 |
| terra `raw-otel` / `raw` | 6/6 / 6/6 | 164.6 / 172.1 | 8.4 / 7.7 | 0 / 0 |
| guard `slow-sql` luna `aspire-lean-traced` / `aspire-lean` | 6/6 / 6/6 | 92.2 / 88.7 (1.04×) | – | 3 / 3 |

**Verdict: `revise`**, by the rule as computed. **Replicate** (`t25-span` controls, same tasks): (a) 5/6 and (b)
hold, (c) not re-run; computes `ship` on (a)+(b). Pooled n = 12 per cell: pass rate equal traced vs untraced on both
routes (CLI 11/12 vs 11/12, MCP 8/12 vs 8/12); CLI time to the cache ~22 vs ~38 s in both rounds. Verdict stays
`revise` as pre-registered (coordinator ruling, 2026-11-19: the `t25-span` controls were approved as same-round
controls for the span row, not as a replication round for T2.5); the robust effect is the CLI timing, the MCP
pass-rate gap is not stable at n = 6. On `t25`: (a) fails: luna `aspire-lean-mcp-all-traced` passed 3/6 (bar 5/6).
(b) fails on one of the two lean arms: seconds to Redis reply dropped on `aspire-lean` (22.1 vs 38.7 s) and rose
on `aspire-lean-mcp-all` (47.7 s over the 3 trials that reached Redis, vs 34.9 s over 6). (c) holds. Not `drop`,
because (b) holds on `aspire-lean`.

**Mechanism.** The client spans change what the slow request looks like: a status trace now holds about 45
`HMGET` spans of 120–280 ms, which is the skill's "many near-identical child spans → N+1 or a chatty loop in the
caller" row. The three luna MCP failures read the trace (65,854 bytes through `list_traces`, 44 KB through the
CLI's JSON, both over F31's 20 KB preview limit, so the model saw a preview), went to `BingoService.cs`, batched
the cache reads, rebuilt `boardadmin`, and stopped with status at 0.6 s and the exporter still running. Every
luna `raw-otel` trial did the same from `traces.jsonl` (6/6 read it, 6/6 edited the source, 0/6 passed). The
luna `aspire-lean-traced` arm, on the CLI, followed step 3 to the cache in 6/6 and passed 6/6, faster. Terra is
unaffected (all 6/6, no source edit in any traced arm). Health stayed `Healthy` under the fault in the local
gate, so the integration's health check added nothing.

**Companion readings** (REPORT §12.4): neither pre-registered reading holds. `raw-otel` closed 68 % of the luna
`raw` → `aspire-lean-traced` time gap, but only by failing faster (0/6 against the ≥ 5/6 the "traces carry it"
reading needs), so on the cheapest model traces without the CLI and skill did not help: 0/6, with all six editing
the source, against raw's 3/6 in this round (p = 0.18) and 3/24 across the pin, so not a measured loss either. On terra traces add nothing either way (164.6 vs 172.1 s).

**What to revise.** What the template change buys, measured twice, is time: with the cache traced, luna on the lean
CLI route reaches the blocked cache in about 22 s instead of 38 s, because the trace now names it. It does not change
pass rates at n = 12 on either route; luna on MCP patches the caller in some trials with or without cache spans (in
`t25` the failing traced trials batched the `HMGET`s after reading the spans as an N+1; in `t25-span` 4/6 untraced
trials edited the source too). The revision is therefore for the timing gain to reach every route: the trace detail
for a ~45-span request is over the harness's preview limit through both CLI JSON and MCP (T2.1/T2.3 lanes), and the
span-table row tried in the follow-up did not earn its place (below). Upstream: the issue draft
[`skills-aspireify-redis-client-tracing.md`](../upstream-issues/skills-aspireify-redis-client-tracing.md) is updated
and stays unfiled; [FINDINGS F47](../FINDINGS.md#f47-with-the-cache-traced-the-lean-skill-reaches-a-blocked-cache-sooner-the-cheapest-models-pass-rate-does-not-change).

#### T2.5 follow-up: span-table row (rule written 2026-11-19, before any `t25-span` trial)

A secondary measurement under T2.5, approved by the coordinating session; it does not change T2.5's verdict.

- **Change.** Skill set `lean-spanrow` = `lean` with `spanrow-overrides/aspire-diagnose/SKILL.md`: one row added to
  step 2's span table, right under the N+1 row: "Many near-identical client spans to one dependency, each slow → The
  dependency is slow (queued or blocked), not the caller: go to step 3." Nothing else changes; new file, new
  fingerprint, so nothing pools with `t25`.
- **Cells**, round `t25-span` (part of run `t25`, which has `raw`), luna, n = 6: `slow-redis` × {`aspire-lean-spanrow`, `aspire-lean-spanrow-traced`,
  `aspire-lean-mcp-all-spanrow`, `aspire-lean-mcp-all-spanrow-traced`} against {`aspire-lean`, `aspire-lean-traced`,
  `aspire-lean-mcp-all`, `aspire-lean-mcp-all-traced`} re-run in the same round (not reused from `t25`); guard
  `slow-sql` × `aspire-lean-spanrow` against `aspire-lean`, same round, since a table row is a route change. 60
  trials.
- **Rule.** The row is **worth proposing** if luna `aspire-lean-mcp-all-spanrow-traced` passes ≥ 5/6 **and** no
  lean cell with the row (the four `slow-redis` cells and the `slow-sql` guard) passes more than one trial fewer
  than its same-round control or has a median `agent_seconds` above 1.15× the control's. Otherwise **not worth
  proposing**, naming the cell. Reported beside it: trials that edited `/app/src`, `seconds_to_redis_reply`, and
  whether the row is quoted in the trajectory before step 3.
- **If it holds**, the issue draft gets the row as the remedy next to the template change; nothing is filed.
  Expected ≈ $1.3 (60 luna at ≈ $0.02); stop and report above $3.

#### T2.5 follow-up results

Round `t25-span`, 60 luna trials (no infrastructure failure), tasks `a814f21` and the `t25` controls' tasks,
**$0.89**. Gates: local fail → repair → pass; `gate-t25-span` 4/5 reward 1, the fifth
(`aspire-lean-mcp-all-spanrow-traced`) lost twice to infrastructure before the oracle ran (environment start
timeout; then the image build could not reach `archive.ubuntu.com`) and returned reward 1 on the third attempt
(`gate-t25-span3`), which was submitted together with the round rather than before it; the cell's image differs
from the `gate-t25`-gated `aspire-lean-mcp-all-traced` by skill files only.

| Cell (luna) | With the row | Same-round control | Time ratio (p) | Redis reply, median (fired) | Edited `/app/src` |
|---|---|---|---|---|---|
| `slow-redis` lean, untraced | 5/6 | 6/6 | **1.28×** (139.3 vs 109.1 s, p = 0.82) | 33.5 vs 38.4 s (6 / 6) | 1 / 0 |
| `slow-redis` lean, traced | 6/6 | 5/6 | 1.03× | 20.4 vs 22.3 s (6 / 5) | 0 / 1 |
| `slow-redis` lean + MCP, untraced | 3/6 | 2/6 | 1.01× | 42.3 vs 42.5 s (5 / 5) | 3 / 4 |
| `slow-redis` lean + MCP, traced | **5/6** | 5/6 | 0.80× | 24.4 vs 31.1 s (5 / 5) | 1 / 1 |
| `slow-sql` lean (guard) | 6/6 | 6/6 | 0.95× | – | 1 / 2 |

**By the rule as computed: not worth proposing.** Condition one holds (traced lean + MCP with the row 5/6); condition
two fails on one cell, the untraced `slow-redis` lean cell, at 1.28× its control. That cell's app has no cache spans,
so the row has nothing to apply to there, and the same trials reached Redis sooner (33.5 vs 38.4 s); the 1.28× is
inside same-round spread (p = 0.82). **Ruling (coordinator, 2026-11-19): rule stands, not worth proposing** (as for
T1.4 and T2.3/T2.4: a pre-registered rule is not re-scoped after the data). The traced-only reading shows no
measurable effect either (traced lean + MCP with the row 5/6, its control 5/6), so neither reading would change what
is sent upstream; the row is not added to the issue draft.

**Replication of T2.5's controls.** The four `slow-redis` controls are `t25`'s cells re-run on the same tasks one
round later. Pass counts did not replicate on the MCP route: untraced lean + MCP went 6/6 → **2/6** (4/6 edited the
source, with no cache spans in the trace), traced lean + MCP 3/6 → 5/6. Pooled over both rounds luna lean + MCP is
8/12 traced and 8/12 untraced, and lean on the CLI 11/12 both ways. What replicated is the time to the cache on the CLI
route: traced 22.1 and 22.3 s against untraced 38.7 and 38.4 s. T2.5's verdict stays as computed on `t25` (coordinator
ruling); the MCP pass-rate gap is not a stable effect at n = 6 (luna MCP patches code with or without cache spans).

### T2.6 A "reach this resource" surface

| | |
|---|---|
| Hypothesis | The dependency step is the part of diagnosis that is integration-specific; a product surface that resolves container, credentials and tool for the agent removes the need for a line per integration in every skill |
| Change | After T4.1's audit: `aspire resource <name> exec -- <cmd>` (resolves container ID, injects credentials, picks the plain port) or a `connect` block in `describe --format Json` |
| Cells | `slow-sql`, `slow-redis` × luna × 6 with a skill whose step 3 says only "use `aspire resource <name> exec`"; against the current lean skill |
| Decision rule | Ship if the generic step matches the hand-written step within 10% on time and pass rate on both faults, which is the point: no integration knowledge in the skill |
| Trials / cost | 2 × 2 × 6 = 24 ≈ $0.40 plus the product work |
| Results | [**ship**](#t26-results): `connect` block in `describe` (from T4.1); generic step 3 6/6 and 6/6, 0.90× and 0.89× the hand-written step; $0.32 |

#### T2.6 rule, as computed (written 2026-11-19, before any `t26` trial)

- **Choice, from T4.1:** the client tool is in the image for 10 of 15 integrations, under the 11 the T4.1 rule
  set for `exec`, so the surface is a **`connect` block in `aspire describe --format Json`**
  ([T4.1 results](#t41-results)). Patch `common/aspire-patches/describe-connect.patch` (CLI only, on
  `30326eb8`; the official daily still starts the AppHost): each container resource whose image the CLI knows
  gets `connect: {command, runs, tool, append, note?}`, a command line that ends where the client's own
  arguments go, credentials read from the container's environment by name, the plain port picked (Redis:
  `--port` when `--tls-port` is set; MongoDB: `--tls --tlsCAFile` when TLS is required; SQL Server: `-C`;
  Kafka: `localhost:29092`), and a host-side command for images without a client (Garnet, Qdrant, Azurite).
  No secret value is ever printed. NATS and Keycloak get none. **Schema shared with T2.4:** T2.4's patch
  (`cli-redis-connect-hint.patch`, cut first and already gated) adds the same top-level field, `connect`, as a
  string for Redis only; T2.6 keeps the name and makes it an object, and T2.4's string is T2.6's
  `connect.note` plus `connect.command` for that one image, so if both ship the upstream proposal is one feature
  (field name agreed with the coordinating session; the two cards run different arms and rounds, no pooling). For the two cells:
  `docker exec <id> sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec psql -U "$POSTGRES_USER" "$@"' sh` and
  `docker exec <id> sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" exec redis-cli -p 6380 "$@"' sh`.
- **Skill.** Set `lean-connect` = `lean` with `connect-overrides/aspire-diagnose/SKILL.md`: step 3 says only
  "`aspire describe <resource> --format Json`, then `<connect.command> <the tool's arguments>`" plus generic
  advice that names no server, tool, port or command (slow operations log, sessions or clients, locks, objects
  on the slow table or key; stop the client, do not restart, flush or drop). The PostgreSQL commands
  (`EXPLAIN`, `\d+`, `pg_stat_activity`), the Redis commands (`SLOWLOG GET`, `CLIENT LIST`) and the
  `-p 6380` note are gone. Steps 1, 2 and 4 are byte-identical. New skill file, new fingerprint.
- **Cells**, round `t26`, luna, Copilot CLI 1.0.99, n = 6: `slow-sql`, `slow-redis` × {`aspire-lean-connect`,
  `aspire-lean-src`} (24). The control is lean on the unpatched source build at the same commit (both CLIs
  managed, not NativeAOT); `slow-sql/aspire-lean-src` (suite `305a8ed`) and `slow-redis/aspire-lean-src`
  (suite `e165626`, emitted by the CLI lane for T2.3/T2.4) are re-run in `t26`. Their skill content equals
  `lean` at the treatment's suite (every `common/skills` change since is additive). The treatment differs by
  the patch and the step-3 text, which is the comparison the card asks for.
- **Time** = `agent_seconds` (the card's "time"); median ratio treatment ÷ control; p = exact two-sided
  Mann-Whitney. `seconds_to_redis_reply` on `slow-redis` and `seconds_to_root_cause_seen` on `slow-sql` are
  reported, not gating.
- **"Within 10 % on time and pass rate", as computed:** one-sided, since the claim is "no loss": on each fault,
  (a) time ratio ≤ 1.10 and (b) the treatment passes at least as many trials as the control (at n = 6 one trial
  is 16.7 points, so a 10-point band on pass rate admits no fewer passes). **`ship`** if (a) and (b) hold on
  both faults. **`drop`** if on either fault the ratio is > 1.25 or the treatment passes ≤ control − 2.
  Otherwise **`revise`**, naming the fault and the condition. Same-round lean drift was up to 0.13 between
  rounds of one cell (T1.9), about the band's width, so a ratio between 1.00 and 1.25 is read with its p.
- **Mechanism measures:** trials that read `connect` and ran its command; trials that wrote their own
  `docker exec`; `redis_cli_first_failed`; trials that patched code instead of stopping the client.
- **Guard:** none beyond the two cells: both faults are the guard scenarios. A trial at the 900 s limit is a
  failure; a trial lost before the agent ran is re-run once. Expected ≈ $0.40 (24 luna at ≈ $0.015).

#### T2.6 results

Round `t26`, 24 luna trials (no infrastructure failure, no timeout), Copilot CLI 1.0.99, pin 2026-11-17, tasks
`0642699` (treatment; controls build from suites `305a8ed` and `e165626`), **$0.32** against the card's $0.40. Gates:
local fail → repair → pass on both faults with the patched CLI; `gate-t26` 2/2 reward 1. Eight runs were first
extracted before ingestion finished (partial folders) and were re-fetched; no trial was re-run.

| Fault | `aspire-lean-connect` pass | `aspire-lean-src` pass | `agent_seconds` median (ratio, p) | Reported: time to the dependency |
|---|---|---|---|---|
| `slow-sql` | 6/6 | 6/6 | 79.1 vs 87.4 (**0.90×**, p = 0.39) | root cause seen 21.9 vs 25.5 s |
| `slow-redis` | 6/6 | 6/6 | 99.6 vs 112.3 (**0.89×**, p = 1.0) | Redis reply 39.9 vs 34.6 s (1.15×) |

**Verdict: `ship`**, by the rule as computed: on both faults the time ratio is ≤ 1.10 and the generic step passes as
many trials as the hand-written one. The skill's step 3 now carries no server, tool, port or command; the product's
`connect` block carries them.

**How the agents used it.** All 12 treatment trials ran `aspire describe <resource> --format Json`. On `slow-sql`
6/6 ran `connect.command` with `-d db -c "…"` appended; none wrote its own `docker exec`. On `slow-redis` 4/6 ran
`connect.command` as given; 2/6 wrote their own `docker exec <id> redis-cli …`, and one of those hit the TLS I/O
error on 6379 first (the trap the block removes when it is used). One trial that did use the block mangled the
64-character container ID in three parallel calls before getting it right (the `redis_cli_first_failed` flag in
2/6). That is why reaching Redis took 5 s longer on the median while the whole task was 11 % faster. Controls: 12/12
wrote their own `docker exec` from the skill's lines. No trial in either arm patched code on `slow-redis`; on
`slow-sql` 2/6 treatment and 1/6 control trials also edited `/app/src` and still passed.

**Limits.** n = 6, one round, luna only, two integrations (PostgreSQL and Redis) of the 13 images the block covers;
the time differences are within same-round drift (p ≥ 0.39), so `ship` means "no loss", which is the claim, not "a
gain". The patch is CLI-side and keyed on image names; a hosting-side version (each integration declaring its own
client command) is the upstream shape. A shorter container reference in `connect.command` (the 12-character ID or
the container name) would remove the copy errors. Issue draft
[`aspire-describe-connect.md`](../upstream-issues/aspire-describe-connect.md);
[FINDINGS F50](../FINDINGS.md#f50-a-connect-block-in-describe-lets-a-skill-drop-every-integration-specific-line-at-no-cost).

### T2.7 MCP tool count and schema size

| | |
|---|---|
| Hypothesis | Five of fifteen tools were never called in 152 MCP-arm trials and two others fewer than four times; their 9.5 KB schema is paid on every model call |
| Change | Measure first: a build that registers only the eight used tools. Then decide between lazy registration (`refresh_tools` already exists), grouping docs tools behind one, and shorter descriptions |
| Cells | `slow-sql`, `read-only` × luna × 6, `aspire-mcp-src` with 8 tools vs 15; guard `slow-redis` luna × 6 on both |
| Decision rule | Pursue if input tokens drop ≥ 5% with no change in route or pass rate; drop if under 2% (the prefix is dominated by other things) |
| Trials / cost | 2 × 6 × 2 = 24 + 12 guard = 36 ≈ $0.60 |
| Results | **2026-11-19: no verdict between the bars**, by the rule as computed: removing the seven tools cuts Copilot CLI's tool schema from 7,659 to 6,770 tokens per model call (−889; the 15 Aspire tools cost 1,986), which is 1.8 % (`slow-sql`) and 2.2 % (`read-only`) of a luna trial's input tokens. The card's median input tokens moved +32 % and −23 % (p = 0.065, 0.093) with pass counts swinging both ways (6/6 vs 3/6, 3/6 vs 5/6): route noise, not the schema. Recommendation: none of the three changes is worth making for tokens; if the docs tools are touched, put them behind one tool (about half the saving). [T2.7 results](#t27-results) below |

#### T2.7 decision rule, as computed (written 2026-11-18, before any `t21-t27` result was read)

- **Round `t21-t27`** (run `t21`, so it shares `t21`'s `raw` cells), same task graph and conditions as T2.1.
- **The eight tools**, from `results/trials.jsonl` (`mcp_calls`, 422 Copilot CLI MCP-arm trials over both pins, excluded
  trials left out): `list_traces` 939 calls in 319 trials, `list_structured_logs` 718 / 280, `list_resources` 671 / 341,
  `list_console_logs` 411 / 180, `list_apphosts` 243 / 241, `wait_for_resources` 214 / 136, `execute_resource_command`
  201 / 140, `list_trace_structured_logs` 133 / 101. **Not registered:** `select_apphost` (13 calls in 13 trials, each right after a
  `list_apphosts` that listed the one AppHost, `/app/apphost.cs`, which the server uses without the call; the server's
  error text names `select_apphost` only when several AppHosts are in scope), `get_doc` (1), `list_integrations`, `doctor`,
  `refresh_tools`, `list_docs`, `search_docs` (0). Patch `common/aspire-patches/mcp-tools8.patch` on the unpatched control
  (it removes the seven after registration; nothing else changes). Local branch `sebros/p2-mcp-tools8`.
- **Arms.** `aspire-mcp-tools8` against `aspire-mcp-src` (15 tools, same source build) on `slow-sql`, `read-only` × luna;
  **guard** `aspire-lean-mcp-tools8` against `aspire-lean-mcp-src` on `slow-redis` luna (lean for the reason given in T2.1).
- **Input tokens, two measures.** (i) The card's: median `input_tokens` per trial, tools8 against src, per cell, with
  `stats.py`'s exact test. (ii) The attributable drop, which isolates the change from route noise: Copilot CLI records the
  tool-schema size of every model call (`tool_tokens` in `session.usage_checkpoint`: 7,659 for the 31 tools of an
  `aspire-mcp-src` trial at this pin, 5,673 for `raw`'s 16, so the 15 Aspire tools cost 1,986 tokens per call). Per tools8
  trial: (src `tool_tokens` − tools8 `tool_tokens`) × that trial's model calls ÷ (its `input_tokens` + that product),
  median per cell.
- **Verdict on (ii).** Pursue if ≥ 5 % in both cells with no change in route or pass rate; drop if under 2 % in both; anything
  else is "no verdict between the bars" and the recommendation is written from the measured share. (i) is reported; at
  n = 6 its spread between rounds is tens of percent, so it decides nothing alone. **Accepted by the coordinating session,
  2026-11-19.** If (i) puts a cell in a different band
  from (ii) with p < 0.05, the case goes to the coordinating session.
- **No change in route or pass rate:** pass count within one trial of the control in each cell; the per-tool MCP call counts
  are reported for both arms, and any call the src arm makes to one of the seven removed tools is listed.
- **Guard:** `aspire-lean-mcp-tools8` passes at least `aspire-lean-mcp-src`'s count minus one (floor reading as in T2.1).
- **Then the recommendation** between lazy registration (`refresh_tools`), one docs tool for the three, and shorter
  descriptions, from the schema bytes of each tool (`tools/list` on the started Bingo app, `evidence/agent-surface/2026-11-18-mcp/`).
- Infrastructure failures as in T2.1.

#### T2.7 results

**Verdict: no verdict between the bars, by the rule as computed.** The attributable drop is 1.8 % in `slow-sql` (under
the 2 % drop bar) and 2.2 % in `read-only` (between the bars), so neither "pursue" (≥ 5 % in both) nor "drop" (< 2 % in
both) holds. In substance the change sits at the drop bar: the schema is not where the MCP arms' tokens go.

**Round `t21-t27`** (run `t21`, sharing its `raw` cells; 36 trials, 2026-11-19), tasks `b3c1f0d`; gates in `gate-t21`.
36 of 36 graded; no 900 s hit, no 5xx, no exclusion.

| Scenario | Model | Arm | Pass | Time | ÷ raw | Input tokens | `tool_tokens` per call | Model calls | MCP calls | $/trial | Run IDs |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| slow-sql | luna | aspire-mcp-src | 3/6 | 146 | 1.32× | 770k | 7,659 | 17 | 10.5 | 0.022 | `2026111919258302`…`262296` |
| slow-sql | luna | aspire-mcp-tools8 | 6/6 | 188 | 1.71× | 1,013k | 6,770 | 22 | 9.5 | 0.025 | `2026111919243400`…`247340` |
| read-only | luna | aspire-mcp-src | 5/6 | 166 | 1.71× | 958k | 7,659 | 20 | 10.5 | 0.024 | `2026111919282980`…`287234` |
| read-only | luna | aspire-mcp-tools8 | 3/6 | 126 | 1.30× | 734k | 6,770 | 17 | 10 | 0.018 | `2026111919267368`…`271190` |
| slow-redis | luna | aspire-lean-mcp-src | 4/6 | 202 | 0.86× | 906k | | | 5 | 0.025 | `2026111919313458`…`317434` |
| slow-redis | luna | aspire-lean-mcp-tools8 | 3/6 | 221 | 0.93× | 932k | | | 1.5 | 0.025 | `2026111919298378`…`302288` |

÷ raw against `t21`'s raw; model calls and `tool_tokens` from Copilot CLI's `session.usage_checkpoint` and
`model.call_start` events (`tools/p2mcp_decide.py t27`); `tool_tokens` was the same in every trial of an arm.

| Measure | slow-sql | read-only |
|---|---:|---:|
| (ii) attributable: 889 tokens × model calls ÷ input tokens, median per trial | **1.8 %** | **2.2 %** |
| (i) median input tokens, tools8 vs src | +32 % (p = 0.065) | −23 % (p = 0.093) |
| Agent seconds | +29 % (p = 0.065) | −24 % (p = 0.39) |
| Pass | 6/6 vs 3/6 (Fisher p = 0.18) | 3/6 vs 5/6 (p = 0.55) |

- **The schema, deterministically.** Copilot CLI counts 7,659 tool-schema tokens per model call with the 15-tool server and
  5,673 for `raw`'s 16 built-in tools, so the Aspire server costs 1,986 tokens per call: 4.1 % to 4.4 % of a luna MCP
  trial's input. The eight-tool build costs 1,097 (−889, −45 %, matching `tools/list` 9,494 → 5,145 bytes at about
  0.2 tokens per byte).
- **(i) is route noise**, in opposite directions in the two cells, and so are the pass counts: both arms fail the way
  luna MCP arms fail at this pin (`slow-sql`: the slow insert left in place, 3 src trials, 2 of them without `psql`;
  `read-only`: the session-level workaround instead of the database default, 3 tools8 trials and 1 src, the failure T1.4
  recorded). The per-tool MCP counts are the same tools in both arms; the one call any src trial made to a removed tool
  was a single `doctor`. The rule's "no change in pass rate" is not met in either cell, in opposite directions, and neither
  difference is significant; it bears on "pursue" only, which the share already excludes. (i) does not put either cell in
  another band with p < 0.05, so nothing goes to the coordinating session on that count. `results/stats.md` pools `t14`'s `aspire-mcp-src`
  trials with this round's (6 vs 12) and shows tools8's `slow-sql` input tokens +32 % at p = 0.018; the rule reads the
  same-round pair only (p = 0.065).
- **Guard holds:** `aspire-lean-mcp-tools8` 3/6 against `aspire-lean-mcp-src` 4/6 (needs ≥ 3).

**Recommendation** (from the schema bytes of each tool, `evidence/agent-surface/2026-11-18-mcp/README.md`):
- **Lazy registration** (`refresh_tools` exists): at most the same 889 tokens, and only under a client that re-reads the list
  on `tools/list_changed`, which this run did not test under Copilot CLI. Not worth the protocol dependency.
- **One docs tool for `list_docs`, `search_docs`, `get_doc`:** 2,229 of the 4,342 removable bytes, about 450 tokens per
  call (≈ 1 % of a luna trial), with no loss of function. The cheapest of the three if the list is touched at all.
- **Shorter descriptions:** the eight kept tools are 5,145 bytes. Descriptions are where the compact patches add bytes
  (patch 0001 +1,130, T2.1 +781), so new arguments should be described tersely; rewriting the existing ones has no
  measured payoff.
- **Overall:** none of the three changes is worth an upstream issue on token grounds. Confirmed by the coordinating session
  (2026-11-19). The whole tool list's 1,986 tokens per call (about 4 % of a luna trial, F48) is the figure a future
  lazy-registration card would start from. The MCP penalty in these cells is the
  content the tools return (32k to 67k characters per trial) and the extra turns, not the tool list.

**Cost.** $0.83 for `t21-t27`, against the card's $0.60.

### T2.8 An MCP route to the dependency

| | |
|---|---|
| Hypothesis | Agents in MCP never leave MCP; on a silent fault they patch code because no tool points at the cache. The CLI skill's step 3 has no MCP equivalent |
| Change | Either a tool (`get_resource_connection` returning container, credentials env, tool invocation) or `list_resources` descriptions that name the CLI step, or `aspire-diagnose` text that says "for step 3 leave MCP and run …" |
| Cells | `slow-redis` × luna × 6, `aspire-lean-mcp-all` with each variant vs the current one; guard `slow-sql` luna × 6 on every variant (a hint that sends agents to the dependency too early would show there) |
| Decision rule | Ship the variant that brings luna to ≥ 5/6 on `slow-redis` without a time regression above 15% on `slow-sql`; if none does, the recommendation stands as "CLI-only lean for cheap models on silent faults" |
| Trials / cost | 3 variants × 6 = 18 + 24 guard = 42 ≈ $0.70 |
| Results | **2026-11-19: no variant ships; "CLI-only lean for cheap models on silent faults" stands, and lean + MCP already passes.** On the shipped set + MCP (round `t28-skills`, the coordinating session's option 1) both controls passed `slow-redis` 0/6 and the variants 1/6, 0/6, 0/6: they sent luna to the cache (`redis-cli` + `SLOWLOG` 4/6 each, 0/12 in the controls) but every trial still patched the application. [T2.8 results, shipped set](#t28-results-shipped-set) below. **Lean: no verdict, premise not reproduced at this pin.** By the rule as computed: the same-round control `aspire-lean-mcp-all` passed `slow-redis` luna 5/6, and every control trial ran `redis-cli` and read `SLOWLOG` or `CLIENT LIST`. Lean + MCP agents leave MCP at this pin. Variant A (`get_resource_connection`) passed 6/6 and was called in every trial before the first `redis-cli`; `slow-sql` 0.73× the control's time (p = 0.065). B (list_resources hint) 4/6, C (skill text) 5/6. A met the card's own ship clause on lean, which the premise clause overrides; it went to the shipped-set round as the candidate, not as a verdict. [T2.8 results](#t28-results) below |

#### T2.8 decision rule, as computed (written 2026-11-19, before any `t28` result was read)

- **Premise, checked before the run.** The card assumes the control fails: at the 11-09 pin MCP agents stayed in MCP on
  `slow-redis` and patched code. At pin 2026-11-17 the control `aspire-lean-mcp-all` passed `slow-redis` luna **6/6** (`t14`)
  and its lean MCP siblings 5/6 (`aspire-lean-mcp-compact`) and 4/6 (`-src`, `t14-guard`); the failure the card describes is
  on the shipped set with MCP (`aspire-skills-mcp` 0/6 in `t01b` and in `t17-copilot`). Put to the coordinating session on
  2026-11-18 with two alternatives (move the variants to the shipped set + MCP, or bar a variant at control + 2 trials).
  Until it rules, the card's base stands and the clause below decides what a passing control means.
- **Round `t28`**, Copilot CLI 1.0.99, pin 2026-11-17, n = 6, luna only, with its own `raw` on `slow-redis` and `slow-sql`
  (series only). Every arm below in the same round, the control included.
- **Arms**, each on `slow-redis` (target) and `slow-sql` (guard): control `aspire-lean-mcp-all` (lean + patches 0001 and 0002,
  `agentic-all`); **A** `aspire-lean-mcp-all-conn`, a `get_resource_connection` MCP tool (container ID, image, names of the
  credential variables, a `docker exec` line for psql / redis-cli with example read-only commands; `agentic-all-conn.patch`);
  **B** `aspire-lean-mcp-all-hint`, `list_resources`' description and response naming the CLI step (`aspire describe <resource>
  --format Json` for `container.id`, then the same two `docker exec` lines as `aspire-diagnose`; `agentic-all-hint.patch`);
  **C** `aspire-lean-mcp-all-step`, skill set `lean-mcpstep`: `aspire-diagnose` with four sentences at the top of step 3
  (the MCP tools cover steps 1, 2 and 4, none shows a dependency's own state, for step 3 leave MCP and use the shell),
  unpatched `agentic-all`. Each variant differs from the control by that one thing.
- **Ship clause (the card's):** a variant ships if luna passes `slow-redis` at least 5/6 and its `slow-sql` median agent
  seconds is at most 1.15 × the control's in the same round. Two or more qualifying: the higher `slow-redis` pass count, then
  the lower `slow-redis` median time.
- **When the control itself passes `slow-redis` at least 5/6** in this round, no variant can bring luna there and the ship
  clause cannot discriminate: the verdict is **"no verdict, premise not reproduced"**. Each variant is then reported against
  the control on pass count, how many trials ran the cache's own client (`redis-cli`) and read `SLOWLOG` or `CLIENT LIST`,
  `seconds_to_redis_reply` (collect.py), use of the variant itself (`get_resource_connection` calls, hint text read, skill
  loaded) and `slow-sql` time against the 1.15 bar, and the base-arm question goes back to the coordinating session.
- **If the control passes fewer than 5/6 and no variant reaches 5/6**, the recommendation stands as the card says: "CLI-only
  lean for cheap models on silent faults".
- **Gates.** Local up → verify fails → reference repair → verify passes on `slow-redis` lean for A (`agentic-all-conn`,
  status 5,884 ms before repair), B (`agentic-all-hint`, 5,027 ms) and C (`lean-mcpstep` + `agentic-all`, 4,839 ms; the
  image's `aspire-diagnose` carries the new sentences), 2026-11-19; oracle gates on every new task before model trials.
  In the A cell `get_resource_connection` returned 822 characters for `cache` (container ID, `REDIS_PASSWORD`, the
  `redis-cli -p 6380` line) and 762 for `postgres`; B's `list_resources` is 10,825 characters (control 10,321).
- **Run on the card's base without a ruling.** The coordinating session had not answered by the time the variants were
  gated; the card's base is run as written so that the same-round control settles the premise, and nothing here rules
  on the alternative.
- Infrastructure failures as in T2.1.

#### T2.8 results

**Verdict: no verdict, premise not reproduced, by the rule as computed.** The same-round control passed `slow-redis`
luna 5/6, so no variant could "bring luna to 5/6". On the card's own ship clause alone, variant A
(`get_resource_connection`) would ship: 6/6 on `slow-redis`, and `slow-sql` at 0.73× the control's time (bar ≤ 1.15).
That case, and the base-arm question (the shipped set + MCP is where agents still stay in MCP), went to the coordinating
session, which answered (option 1, 2026-11-19): lean is recorded as "no verdict, premise not reproduced at this pin" and the
variants move to the shipped set + MCP (rule and results below). Nothing was re-run.

**Round `t28`** (60 trials, 2026-11-19), tasks `9438613`; gates `gate-t28` 6/6 reward 1 (`2026111919577782`…`19590200`).
60 of 60 graded; no 900 s hit, no 5xx, no exclusion. Extractions taken while the round was finishing were deleted and
fetched again after `wait.py` reported it finalized.

| Arm | slow-redis pass | ran `redis-cli` | read `SLOWLOG`/`CLIENT LIST` | s to first Redis reply | slow-redis time | variant used | slow-sql pass | slow-sql time | ÷ control | p |
|---|---|---:|---:|---:|---:|---|---|---:|---:|---:|
| raw | 1/6 | | | | 184 | | 6/6 | 130 | | |
| aspire-lean-mcp-all (control) | 5/6 | 6 | 6 | 37.3 | 103 | aspire-diagnose 6/6 | 6/6 | 99 | 1.00 | |
| A `-conn` | **6/6** | 6 | 6 | 28.8 (p = 0.18) | 90 (p = 0.24) | `get_resource_connection` 6/6 | 6/6 | 72 | **0.73** | 0.065 |
| B `-hint` | 4/6 | 5 | 5 | 37.7 | 147 | `list_resources` 4/6 | 6/6 | 97 | 0.98 | 0.94 |
| C `-step` | 5/6 | 6 | 6 | 32.4 | 111 | aspire-diagnose 6/6 | 6/6 | 78 | 0.79 | 0.13 |

Time = agent seconds, median; p = exact Mann-Whitney against the control (`tools/p2mcp_decide.py t28`).

- **The premise does not hold on lean at this pin.** 23 of the 24 lean + MCP `slow-redis` trials ran `redis-cli` in the
  container and read `SLOWLOG` or `CLIENT LIST`; the one that did not was B's. With `aspire-lean-mcp-all` 6/6 in `t14` and
  5/6 here, it is 11/12 over two rounds. The failures that remain reached the cache and still
  patched the application instead of stopping the exporter (control `2026111920173078`, B `…199756`, C `…209440`), as in
  T2.1's guard; B's `…198942` never ran `redis-cli`.
- **A is used when offered.** Every A trial called `get_resource_connection` on `bingo-redis` (two also on `bingo-postgres`)
  2 to 5 tool calls before its first `redis-cli`, ran `redis-cli` in the container ID it returned, and never ran
  `aspire describe` at all (the control's route to `container.id`). Its first Redis reply came 8.5 s earlier (median,
  p = 0.18). It also took the `slow-sql` cell 27 % faster (p = 0.065), the largest change in the round; every A `slow-sql`
  trial called the tool once (on the database), so the tool may be the cause, but at n = 6 chance is not excluded.
- **B did not help.** Its text sits in the `list_resources` response (10,825 characters against 10,321). Two trials never
  called `list_resources` (both ran `redis-cli`, one passed); the one trial that skipped `redis-cli` (`2026111920198942`)
  had read the hint four times.
- **C** (four sentences in step 3) changed nothing measurable: the control's agents already leave MCP for step 3.
- Variant A is the MCP twin of T2.6's CLI `connect` block (`describe --format Json`) and of T2.4's Redis hint; the three
  should be read together.

**Cost.** $0.91 for `t28`, against the card's $0.70.

#### T2.8 on the shipped set + MCP: decision rule, as computed (written 2026-11-19, before any `t28-skills` result was read)

- **Why a second round.** The coordinating session's answer to the base-arm question (option 1, 2026-11-19): T2.8 on lean is
  recorded as **"no verdict, premise not reproduced at this pin"** (`aspire-lean-mcp-all` `slow-redis` luna 5/6 in `t28`,
  6/6 in `t14`), and the three variants move to the shipped set + MCP, where the failure the card describes is
  (`aspire-skills-mcp` `slow-redis` luna 0/6 in `t01b` and in `t17-copilot`; none of those 12 trials but one ran `redis-cli`).
- **Round `t28-skills`** (run `t28`, sharing its `raw` cells), Copilot CLI 1.0.99, pin 2026-11-17, luna, n = 6, every arm in
  the same round.
- **Arms.** Controls: `aspire-skills-mcp` (the shipped v0.0.6 set + MCP on the official daily, the arm of the 0/6 history),
  on `slow-redis`; `aspire-skills-mcp-all` (the same set + MCP on the source build with patches 0001 + 0002), on `slow-redis`
  and `slow-sql`, the arm each variant differs from by one thing. Variants, on `slow-redis` and `slow-sql`:
  **A** `aspire-skills-mcp-all-conn` (`agentic-all-conn.patch`), **B** `aspire-skills-mcp-all-hint` (`agentic-all-hint.patch`),
  **C** `aspire-skills-mcp-all-step` (skill set `current-mcpstep`, `agentic-all`). A and B are the patches gated for the lean
  round, unchanged.
- **Where C's text goes, and why.** The shipped set has no `aspire-diagnose` and no dependency step anywhere; its router
  sends "something's wrong" to `aspire-monitoring`. C adds **step 6 to `aspire-monitoring`'s Investigation Workflow**
  (telemetry and the MCP tools do not show a dependency's own state; when traces point at a database or cache, or show
  nothing, leave MCP and run its client inside the container: the same `aspire describe` → `docker exec` psql /
  `redis-cli -p 6380` lines as `aspire-diagnose` step 3), and **one sentence on the router's "something's wrong" bullet**
  pointing to that step, so the text is on the router's path whether an agent loads the router, the monitoring skill, or
  both. Because the shipped set has no such step, all three variants carry the commands (A in the tool's output, B in
  `list_resources`' text, C in the skill). Reach: in the 12 earlier `aspire-skills-mcp` `slow-redis` luna trials, 6 loaded
  no skill at all, so C can reach at most about half the trials; A and B reach any trial that uses MCP.
- **Ship clause (the card's, unchanged):** a variant ships if luna passes `slow-redis` at least 5/6 and its `slow-sql` median
  agent seconds is at most 1.15 × `aspire-skills-mcp-all`'s in the same round. Two or more qualifying: the higher
  `slow-redis` pass count, then the lower `slow-redis` median time. The bar is not changed to "control + 2".
- **Premise checks, in order.** (1) If the official `aspire-skills-mcp` passes `slow-redis` at least 5/6 in this round, the
  verdict is "no verdict, premise not reproduced on the shipped set either". (2) If `aspire-skills-mcp-all` passes at least
  5/6, patches 0001 + 0002 alone bring the shipped set there and no variant can be credited: "no verdict" for the variants,
  and the patches' effect is reported.
- **Fallback (the card's sentence):** if neither check fires and no variant reaches 5/6 within the `slow-sql` bar, the
  recommendation stands as **"CLI-only lean for cheap models on silent faults"**, with the added fact that lean + MCP
  already passes (`aspire-lean-mcp-all` 6/6 in `t14`, 5/6 in `t28`).
- **Reported beside the verdict:** per arm, skills loaded (router, monitoring, none), `redis-cli` run and `SLOWLOG`/`CLIENT
  LIST` read, `seconds_to_redis_reply`, use of the variant (`get_resource_connection` calls, `list_resources` calls, step 6
  in a loaded skill).
- **Gates:** local up → fail → repair → pass for `current-mcpstep` + `agentic-all` on `slow-redis` (A and B were gated on the
  lean image); oracle gates on every new task before model trials.
- **Cost, before submitting:** 54 trials at the shipped-set MCP luna rate measured at this pin ($0.013 to $0.039, about
  $0.025) ≈ $1.35, 1.9× the card's $0.70 for this round alone; with `t28` ($0.91) T2.8 comes to about $2.30, 3.2× the card.
  The round itself is under the 3× stop rule, and the second round is the coordinating session's request.
- Infrastructure failures as in T2.1.

#### T2.8 results, shipped set

**Verdict: no variant ships; the recommendation stands as the card's fallback, "CLI-only lean for cheap models on silent
faults", with the added fact that lean + MCP already passes** (`aspire-lean-mcp-all` 6/6 in `t14`, 5/6 in `t28`). The
premise holds on the shipped set: both controls passed `slow-redis` 0/6, so neither premise check fired, and no variant
came near the 5/6 bar (A 1/6, B 0/6, C 0/6).

**Round `t28-skills`** (run `t28`, its `raw` cells; 54 trials submitted 2026-11-19) and `t28-skills-topup` (7 re-runs).
Tasks `3d5b202` (suite `d5eff29`). Gates: `gate-t28s` 2 of 8 reward 1, the other 6 timed out building the image (environment
start over 1,800 s; CES builds took 1,740 to 1,800 s at that hour against 180 to 250 s earlier) and passed on re-submission
(`gate-t28s-2`, 6/6 reward 1, builds 310 to 513 s). Six model trials failed the same way before any agent ran (`apt-get` exit
100 in the image build) and one C `slow-redis` trial reached the 900 s limit (`2026111929409126`, graded 1, no 5xx); all
seven carry an `excluded` reason in the ledger and were re-run once, as the rule says (the C re-run `2026111932963078`
failed). 54 graded; no model-service 5xx.

| Arm | slow-redis pass | skills loaded (none / router / monitoring) | ran `redis-cli` | read `SLOWLOG` | ran `CLIENT LIST` | s to first Redis reply | slow-redis time | variant used | slow-sql pass | slow-sql time | ÷ control | p |
|---|---|---|---:|---:|---:|---:|---:|---|---|---:|---:|---:|
| `aspire-skills-mcp` (official daily) | 0/6 | 1 / 4 / 5 | 0 | 0 | 0 | | 164 | monitoring 5/6 | | | | |
| `aspire-skills-mcp-all` (control) | 0/6 | 3 / 2 / 3 | 2 | 0 | 0 | 61.7 | 163 | monitoring 3/6 | 6/6 | 186 | 1.00 | |
| A `-conn` | 1/6 | 0 / 6 / 6 | 4 | 4 | 1 | 47.2 | 216 | `get_resource_connection` 4/6 | 6/6 | 174 | 0.94 | 0.82 |
| B `-hint` | 0/6 | 1 / 5 / 4 | 4 | 4 | 1 | 56.3 | 164 | `list_resources` 6/6 | 6/6 | 154 | 0.83 | 0.18 |
| C `-step` | 0/6 | 2 / 4 / 4 | 4 | 4 | 0 | 53.4 | 173 | monitoring 4/6 | 6/6 | 119 | **0.64** | **0.041** |

Run IDs: official `2026111929377044`…`380236`; control `…384316`…`387468` (slow-redis), `…414450`…`31389452` (slow-sql); A
`…391476`…`394958`, `…421718`…`31393192`; B `…399722`…`31385972`, `…428250`…`431618`; C `…406512`…`32963078`,
`…435758`…`31396242` (`tools/p2mcp_decide.py t28s`).

- **The variants send luna to the cache; they do not get it to the cause.** Each variant had 4 of 6 trials run `redis-cli`
  in the container and read `SLOWLOG` (0 of 12 in the two controls; two control trials ran `redis-cli` without reading it).
  Two graded trials ran `CLIENT LIST`, the command that names the exporter's connection: A's, the round's only graded pass,
  and one in B, which failed. The excluded C trial at the time limit had also run it, and graded 1. Every one of the 30 `slow-redis` trials, controls and
  variants, patched `BingoService.cs`. The shipped set has nothing like `aspire-diagnose`'s "one expensive command repeated
  by one client is the cause; stop that client", and none of the three variants carried that sentence.
- **Reach.** A was called in 4 of 6 trials (two never used it), B's text was in front of every trial (6/6 called
  `list_resources`), C's step 6 was in a loaded skill in 4 of 6 (two trials loaded no skill). C's router sentence did not
  change how often the monitoring skill loaded (4/6 against the control's 3/6).
- **`slow-sql` guard** holds for every variant (0.64× to 0.94×, all 6/6). C's `slow-sql` cell was faster than the control
  (0.64×, p = 0.041); not decisive, n = 6.
- **Patches 0001 + 0002 alone** did not move the shipped set (`aspire-skills-mcp-all` 0/6, like the official daily 0/6).

**Cost.** $1.34 for the 54 graded trials (plus the excluded timeout trial), against $1.35 estimated; T2.8 in total about
$2.25 with `t28`, 3.2× the card's $0.70, as stated before the round.

### T2.9 Cold start through MCP

| | |
|---|---|
| Hypothesis | `wait_for_resources` takes a list, so the MCP route folds the two `aspire wait` calls into one; the endpoint read moves to `list_resources`; `aspire start` stays in the shell. Net: one call fewer, more bytes read. No cold-start cell has had the MCP server (REPORT §7.3) |
| Arms | `aspire-lean-mcp` on `cold-start`, against T1.6's `aspire-lean`, `aspire-lean-start` and `aspire-cli` cells from the same round |
| Cells | `cold-start` × luna, terra, `gpt-6.2-sol` × 6 |
| Decision rule | Informational for the blocking-start card: if the MCP route is within 10% of `aspire-lean-start`, the gap to raw is the start itself and T2.2 is the only lever; if it is faster, `aspire-start` should say so |
| Trials / cost | 3 × 6 = 18 ≈ $1.20 |
| Results | **start itself is the gap, for MCP registered, not the MCP route** (2026-11-19, round `t22`): `aspire-lean-mcp` ÷ `aspire-lean-start` 1.02 / 1.09 / 1.04 (luna / terra / sol), but no trial used `wait_for_resources` or `list_resources`, so the MCP route was not taken. [Results](#t29-results) |

#### T2.9 rule, as computed (written 2026-11-19, before any `t22` result was read)

- **Cells**, round `t22` (same round as T2.2), `cold-start` × luna, terra, `gpt-6.2-sol` × 6, official daily:
  `aspire-lean-mcp` (lean + MCP server; new task) against same-round `aspire-lean`, `aspire-lean-start` and
  `aspire-cli` (re-run here, not `t16`).
- **Measure:** `seconds_to_verified_up`. `collect.py`'s reader now also takes MCP evidence: `list_resources`
  (snake_case `display_name`, `state` Running, `health_status` Healthy) and `wait_for_resources` ("# WAIT
  RESULT", a resource's unique name with `"outcome": "success"`). On the 361 cold-start trials already
  collected, this changes one value (`t01b` `aspire-skills-mcp` luna 2026111819733324, 43.4 → 39.7 s: it waited
  through MCP).
- **Per model:** R = median(`aspire-lean-mcp`) ÷ median(`aspire-lean-start`). 0.90 ≤ R ≤ 1.10: the start itself is
  the gap, and T2.2 is the only lever; R < 0.90: the MCP route is faster, and `aspire-start` should say so;
  R > 1.10: the MCP route is slower. The card's reading is the one that holds on at least two of the three models;
  otherwise it is "mixed". Informational, no ship verdict. MCP tool calls used (`wait_for_resources`,
  `list_resources`) and `agent_seconds` are reported.

#### T2.9 results

**Reading: the start itself is the gap, for "MCP registered", not for the MCP route** (R within 0.90–1.10 on all three
models; the card's informational question is answered only for registration). Round `t22`, same round as T2.2,
official daily. Medians to verified-up, `aspire-lean-mcp` ÷ `aspire-lean-start`: luna 40.2 / 39.3 s = 1.02 (p = 0.59),
terra 41.8 / 38.5 s = 1.09 (p = 0.028), sol 41.0 / 39.4 s = 1.04 (p = 1.0). All 72 trials passed.

| Model | `aspire-cli` | `aspire-lean` | `aspire-lean-start` | `aspire-lean-mcp` | Run IDs (`-mcp`) |
|---|---:|---:|---:|---:|---|
| luna | 40.1 s | 44.8 s | 39.3 s | 40.2 s | 2026111919744554 – 19748064 |
| terra | 39.3 s | 38.5 s | 38.5 s | 41.8 s | 2026111919836934 – 19840570 |
| sol | 35.5 s | 39.5 s | 39.4 s | 41.0 s | 2026111919946222 – 19949896 |

**The MCP route was not taken.** No trial called `wait_for_resources` or `list_resources` (0 of 18 each); the only
MCP calls were `list_apphosts`, one per trial in luna 6/6 and sol 4/6, none on terra, and every trial loaded `aspire-orchestration` and waited with the
CLI, as `aspire-lean` did. The arm therefore measured "the MCP server registered", which costs nothing on cold
start, not the MCP route the card described (one `wait_for_resources` for both resources). The reading the card
asked for holds and agrees with T2.2: what separates Aspire from raw on this scenario is the time to a healthy app,
which neither a different route nor a blocking start shortens. Luna `aspire-lean-mcp` was 0.90× `aspire-lean`
(p = 0.017) with the same skill load and the same commands; that difference is not explained.

### T2.10 Agent instructions file beside the AppHost (`AGENTS.md`)

Added 2026-11-18. Not a source build: the product change is a file that `aspire new` templates and
`aspire agent init` would write; until the CLI does, the image places the same file itself.

| | |
|---|---|
| Hypothesis | Skills are pull: the model must pick one from a one-line description, once, at the moment it knows least. An instructions file beside the AppHost is push: it is in context on every turn, before the plan forms. The measured failures are selection failures, not knowledge failures: luna loaded no skill in 4 of 6 skills-only trials (F17), no shipped-set trial reached the duration filter three hops down (0 of 48), the router overrides a narrowed trigger (T1.2), and two harnesses never see the skills at all (T1.7, T1.9). A short file that names the AppHost, the start and diagnosis commands, and which skill owns which job should recover those cells, and it works on any harness that reads `AGENTS.md` or `CLAUDE.md` with no plugin, MCP or skill plumbing |
| Change | **Product:** `aspire new` templates and `aspire agent init` write `AGENTS.md` next to the AppHost (`CLAUDE.md` too, or a one-line pointer, for Claude Code). **Simulated here:** the image copies `common/agents-md/AGENTS.md` to `/app/AGENTS.md` in the `-agents` arms, with the AppHost path filled in; nothing else differs from the control arm. The file is at most 400 tokens (bytes recorded in the ledger) and says only: this is an Aspire app and where the AppHost is; how to start it and wait for resources; `aspire describe` for endpoints and state; console logs per resource; `aspire otel traces` with a `duration:>` filter as the first move for "slow"; one line per skill naming its job (this replaces the router). It names no fault, no resource type and no fix, and is reviewed against the fixtures before the round, like the lock-comment leak in T0.2 |
| Arms | `aspire-lean-agents` vs `aspire-lean` (primary: does the file fix selection for the proposed set); `aspire-cli-agents` vs `aspire-cli` (does the file alone teach the commands, with no skill to route to); `aspire-skills-agents` vs `aspire-skills` (does it rescue the shipped bundle without editing it). Controls are reused from the same pin where a cell exists (`t01b`, `t13`, `t16`); otherwise re-run in the round |
| Cells | `slow-sql`, `cold-start` × luna, terra × 6 on the three `-agents` arms; `heldout-cache` × luna × 6 on `aspire-lean-agents` (same file, only the AppHost path differs: generalization); guard `slow-redis` × luna × 6 on `aspire-lean-agents` |
| Measures | Time and tokens (the file is a per-turn tax, so tokens are reported next to time), first skill loaded and whether the duration filter was used (from the trajectory), characters read; cold start: commands to first healthy page |
| Decision rule | `ship` (file an issue for `aspire new` and `aspire agent init` to write it) if `aspire-lean-agents` is ≥ 20% faster than `aspire-lean` on luna in `slow-sql` or `cold-start` (p < 0.10), terra does not regress by more than 10%, total tokens do not rise by more than 10%, and the guard holds (`slow-redis` luna passes ≥ `aspire-lean` minus one). If `aspire-cli-agents` matches `aspire-lean` within 10%, report that the commands, not the skills, carry the gain: the file then replaces the diagnosis skills for Phase 3 to weigh. If `aspire-skills-agents` closes the shipped set's gap to `aspire-lean`, the file is the cheaper fix than the Phase 3 rewrite. `drop` if no luna cell moves |
| Caveat | The workspace README in every image already says the app is Aspire and gives the start commands (prompts end with "README.md describes this workspace"), so the benchmark measures injected context, not discovery of Aspire. In the field, where a README may say nothing, the effect is larger, not smaller. Copilot CLI first; VS Code reads `AGENTS.md` too and follows in the T1.9 lane; Claude Code waits for T4.7 and would read `CLAUDE.md` |
| Trials / cost | 3 arms × 2 scenarios × 2 models × 6 = 72 + 6 held-out + 6 guard = 84 ≈ $3.50, plus controls not on the pin |
| Results | **drop** (2026-11-19, round `t210`, 102 trials, $3.47): no luna cell reached ≤ 0.80 (`slow-sql` 0.93, p = 0.94; `cold-start` 0.86, p = 0.002), and the `slow-redis` guard failed (2/6). The file reaches the prompt (289 tokens) and fixes command selection: every `-agents` trial on `slow-sql` used the `duration:>` filter, against 1 of 27 in the cli and shipped-set controls. Speed did not follow on luna. [Results](#t210-results) |

#### T2.10 rule, as computed (written 2026-11-18, before any `t210` result was read)

- **The file.** One file per skill family in `common/agents-md/`, copied to `/app/AGENTS.md` (build argument
  `AGENTS_MD`, both image templates). The first 577 bytes (AppHost, start and wait, `describe`, console logs,
  `otel traces --search "duration:>500"` for slow) are byte-identical in all three. The skills section lists
  exactly the skills present in that image, one job line each: `cli.md` 577 bytes / 143 tokens (no skills);
  `lean.md` 1,129 / 280 (eight lean skills, no router); `skills.md` 1,114 / 279 (the shipped eight, router
  included, since nothing else may differ from `aspire-skills`). Tokens are o200k counts; the ledger records
  `agents_md` and `agents_md_bytes` per trial, and Copilot CLI's prompt-segment count is reported from the
  trials. Bingo and Shop both keep the AppHost at `/app/apphost.cs`, so `heldout-cache` gets the same bytes.
- **Leak review** (every literal against each fixture; control = the arm without the file):
  - `slow-sql` (trigger that scans an unindexed JSON audit history; fix: an index), `slow-redis` (a host
    script running `KEYS` in a loop; fix: stop it), `heldout-cache` (catalogue cache keyed per shopper; fix:
    the key): the file names no database, cache, trigger, index, key, host process or script, and no
    resource name (`aspire wait <resource>` stays generic).
  - `cold-start` (nothing running; reference repair `aspire start --isolated`, `aspire wait` ×2): the start
    and wait lines repeat the workspace README word for word, so they are not new to any arm.
  - `duration:>500` and its flags are `aspire-diagnose`'s first command, so the lean arms' control already
    had them; they are new to `aspire-cli-agents`, and to `aspire-skills-agents` in this place (the shipped set's only
    `duration:>100` examples are in `aspire-monitoring/references/monitoring.md`, three hops down). 500 ms is the calibration floor of both slow fixtures (≥ 500 ms per write or page),
    so the default threshold catches them by construction. That is the product claim under test, but it
    means a lower default would not be neutral.
  - Job lines paraphrase each skill's own description; "port conflicts, file-lock build errors" is the
    orchestration skill's own scope, not a database lock (relevant to `stuck-db`, not in this card).
  - No image had `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` or `.github/copilot-instructions.md` in `/app` before.
- **Delivery check first.** Round `t210-probe`: one luna `slow-sql/aspire-lean-agents` trial (ledger row
  `excluded`). It counts only if `copilot-cli.log` lists a prompt segment that was absent from the control's
  segment list and the process log carries a line of the file in the system prompt. A `cat AGENTS.md` by
  the model is not push. If the file is not injected the card stops there.
- **Controls** (pin 2026-11-17, Copilot CLI 1.0.99, same skill content as the `-agents` image: lean cells
  only at `tasks 1479041e`, never `t01b`'s lean): luna `slow-sql` lean `t17-copilot`; `cold-start` lean and
  skills `t16`; `aspire-cli` `t01b` (+ `t16` on cold start); `heldout-cache` lean `t02-heldout3`;
  `slow-redis` luna lean `t14` + `t14-guard` + `t17-copilot` (18). Missing, re-run in `t210`: terra
  `slow-sql` lean ×6, `slow-sql` skills luna ×6 (pooled with `t01b-plugin`'s 3) and terra ×6. Cells pool
  every same-pin, same-content trial, as `stats.py` does.
- **Time** = `agent_seconds`; ratio = median ÷ median; p = exact two-sided Mann-Whitney. **Tokens** = per
  trial `input_tokens + output_tokens`, median ratio.
- **`ship`** if all hold: (a) on luna, `aspire-lean-agents` ÷ `aspire-lean` ≤ 0.80 with p < 0.10 in
  `slow-sql` or `cold-start`, passing no more than one trial fewer; (b) terra ≤ 1.10 in both scenarios;
  (c) token ratio ≤ 1.10 in each of the four lean cells; (d) guard: `slow-redis` luna `aspire-lean-agents`
  passes ≥ round(6 × the control's pass rate) − 1. **`drop`** if (a) fails in both luna cells. Otherwise
  **`revise`**, naming the condition that failed.
- **Secondary readings**, reported, not gating: *commands carry it* if `aspire-cli-agents` ÷ `aspire-lean`
  is within 0.90–1.10 in all four cells; *cheaper than the rewrite* in a cell where `aspire-skills` ÷
  `aspire-lean` > 1.10 and `aspire-skills-agents` ÷ `aspire-lean` ≤ 1.10. `heldout-cache` lean-agents ÷ lean
  (luna) is the generalization reading.
- **Mechanism measures** from the trajectories: first skill loaded; any command or MCP call with
  `duration:>`; `tool_result_content_chars`; cold start: tool calls before the first result that shows the
  front end serving (HTTP 200 or `Running`/`Healthy` for it).
- A trial at the 900 s limit is graded as a failure and counted separately; a trial lost before the agent ran
  is re-run once. Expected spend about $7 (103 trials), twice the card's $3.50, at the cost per trial
  luna and terra have shown this pin.

#### T2.10 results

**Verdict: `drop`**, by the rule as computed. Condition (a) fails in both luna cells: `aspire-lean-agents` ÷
`aspire-lean` is 0.93 on `slow-sql` (p = 0.94) and 0.86 on `cold-start` (p = 0.002, significant but short of
≤ 0.80). The guard (d) fails: `slow-redis` luna passed 2/6 against a threshold of 4 (control 14/18). Token
condition (c) fails by a hair on luna `slow-sql` (1.101). Terra (b) holds (1.07, 0.87).

Round `t210` (Copilot CLI 1.0.99, suite `a69d80b`, tasks `dbbd74d`, dataset `d58685e`), 102 trials, no
timeouts, no model-service 5xx, no infrastructure losses. Gates: local `slow-sql/aspire-lean-agents` fail
(2,430 ms) → repair → pass; `gate-t210` 8/8 reward 1. **Delivery:** in every `-agents` trial Copilot CLI's
prompt has a `custom_instructions` segment absent from every control: 289 tokens (`lean.md`), 288 (`skills.md`),
152 (`cli.md`), sent with every model call. Probe `t210-probe` (2026111909228674, excluded) showed the file's
text in the logged system prompt.

| Scenario | Model | Arm | Pass | Time s | Tokens (M) | vs control: time (p), tokens | `duration:>` used | First skill | Run IDs |
|---|---|---|---|---:|---:|---|---|---|---|
| slow-sql | luna | aspire-lean-agents | 6/6 | 117 | 0.44 | lean 0.93 (0.94), 1.10 | 6/6 (control 6/6) | aspire-diagnose 6 | 2026111909884576 – 09887810 |
| slow-sql | luna | aspire-cli-agents | 6/6 | 151 | 0.69 | cli 0.95 (0.94), 0.79 | **6/6** (control 0/6) | none | 2026111909892014 – 09895144 |
| slow-sql | luna | aspire-skills-agents | 6/6 | 235 | 1.22 | skills 1.70 (0.083), 1.75 | **6/6** (control 1/9) | `aspire` router 6 (control: none 6/9) | 2026111909899466 – 09902596 |
| slow-sql | terra | aspire-lean-agents | 6/6 | 59 | 0.22 | lean 1.07 (0.026), 1.06 | 6/6 (6/6) | aspire-diagnose 6 | 2026111909884578 – 09887794 |
| slow-sql | terra | aspire-cli-agents | 6/6 | 59 | 0.26 | cli 0.74 (0.065), 0.72 | **6/6** (0/6) | none | 2026111909892016 – 09895116 |
| slow-sql | terra | aspire-skills-agents | 6/6 | 63 | 0.35 | skills 0.92 (0.49), 0.82 | **6/6** (0/6) | aspire-monitoring 6 (6) | 2026111909899448 – 09902586 |
| cold-start | luna | aspire-lean-agents | 6/6 | 53 | 0.13 | lean 0.86 (0.002), 0.92 | | aspire-orchestration 6 | 2026111909884560 – 09887696 |
| cold-start | luna | aspire-cli-agents | 6/6 | 53 | 0.07 | cli 1.03 (0.95), 0.80 | | none | 2026111909892008 – 09895142 |
| cold-start | luna | aspire-skills-agents | 6/6 | 52 | 0.16 | skills 0.87 (0.011), 0.96 | | `aspire` 6 (control 4) | 2026111909899432 – 09902594 |
| cold-start | terra | aspire-lean-agents | 6/6 | 46 | 0.11 | lean 0.87 (0.015), 1.09 | | aspire-orchestration 6 | 2026111909884574 – 09887766 |
| cold-start | terra | aspire-cli-agents | 6/6 | 50 | 0.08 | cli 0.91 (0.070), 1.07 | | none | 2026111909892004 – 09895122 |
| cold-start | terra | aspire-skills-agents | 6/6 | 46 | 0.11 | skills 0.86 (0.17), 0.92 | | aspire-orchestration 6 | 2026111909899440 – 09902604 |
| heldout-cache | luna | aspire-lean-agents | 6/6 | 192 | 0.83 | lean 0.82 (0.065), 1.10 | 6/6 (6/6) | aspire-diagnose 6 | 2026111909906920 – 09910082 |
| slow-redis | luna | aspire-lean-agents | **2/6** | 194 | 0.88 | lean 1.43 (0.090), 1.77 (14/18) | 6/6 (18/18) | aspire-diagnose 6 | 2026111909906928 – 09910040 |

Controls (pin 2026-11-17, same skill content; the lean ones are all `lean a14396de6b87`, the revised step 1):
`slow-sql` lean luna `t17-copilot` (2026111875729204 – 75732400), terra **`t210`** (2026111909906924 – 09910084);
`slow-sql` cli `t01b`; `slow-sql` skills luna `t01b-plugin` + **`t210`** (9 trials), terra **`t210`**
(2026111909914356 – 09917480); `cold-start` lean and skills `t16`, cli `t01b` + `t16`; `heldout-cache` lean
`t02-heldout3`; `slow-redis` lean `t14` + `t14-guard` + `t17-copilot`. Times are `agent_seconds` medians;
tokens are input + output.

Characters read (median `tool_result_content_chars`, with the file against without): `slow-sql` luna lean
71 k / 69 k, cli 111 k / 154 k, shipped 93 k / 106 k; terra lean 68 k / 56 k, cli 103 k / 83 k, shipped
100 k / 79 k; `cold-start` 16–26 k against 11–35 k; `heldout-cache` 66 k / 62 k; `slow-redis` 100 k / 87 k.
The leak review of the file against all four fixtures is in the rule block above, written before the round.

**Secondary readings.** *Commands carry it:* no. `aspire-cli-agents` ÷ `aspire-lean` is 1.20 (luna
`slow-sql`), 1.07, 0.87 and 0.94, not within 0.90–1.10 in all four cells. But the file alone taught the
command: every `aspire-cli-agents` slow-sql trial used the duration filter (0/12 in the control), terra got
faster (0.74, p = 0.065; tokens 0.72, p = 0.002), and luna read less (111 k characters against 154 k) without
getting faster. *Cheaper than the rewrite:* no. The one cell where the shipped set is more than 10 % behind
lean, terra `slow-sql` (1.24), narrows to 1.14. On luna the file made the shipped set slower (1.70×, p = 0.083;
tokens 1.75×): its skill line names `aspire` as the entry point, and all six trials loaded the router and
then `aspire-monitoring` (control: no skill in 6 of 9). This is one cell (p = 0.083): on `cold-start` the same
router-first load (`aspire`, then `aspire-orchestration`, 6/6) was 13 % faster than the control. *Generalization:* `heldout-cache` luna 0.82
(p = 0.065), 6/6, with the same bytes on a different stack.

**Mechanisms.**
- **The file fixes selection, the selection was not what was slow.** On `slow-sql` it put the `duration:>`
  filter in front of every agent that lacked it: 24/24 cli and shipped-set `-agents` trials against 1/27 in
  their controls. The lean set already reached it 6/6 through `aspire-diagnose`, so on lean the file is
  redundant and adds 289 tokens per call. That redundancy is the primary comparison's null.
- **Cold start is 13–14 % faster with any skill set** (lean 0.86 and 0.87, shipped 0.87 and 0.86; cli
  1.03 and 0.91), but the mechanism is not identified: every trial in both arms still read `README.md`, and
  tool calls barely moved (median per trial, with the file against without: luna lean 10 against 11.5, shipped 9 against 9; terra
  lean 8 against 7.5, shipped 8 against 9).
  The controls are from `t16` and `t01b`, not this round, so round drift is not excluded; a same-round control
  would settle it. **Settled in [T2.11](#t211-results): round drift.** Same-round lean ran 53.0 s against `t16`'s
  61.2 s, and the file with the skill kept was level with it (0.94× to verified-up). Tool calls before the first result showing the front end serving (regex over results,
  approximate): lean-agents 7.5 against 10 on luna, 7 against 6 on terra.
- **Guard:** all six `slow-redis` trials named the `report-exporter`'s `KEYS` scans (control 17/18). The four
  failures made the status handler's 43 Redis reads concurrent and left the exporter running; the two passes
  stopped it. The control fails the same way (4 of 18 edited the app instead), so the file did not introduce
  the failure mode. 4/6 against 4/18 is two-sided Fisher p = 0.13, so the rule's guard fails on a split that
  could be chance.

**Cost** $3.47 (102 trials $3.46, gates and probe $0.01), the card's $3.50 and half the $7 expected: the
`-agents` cells cost the same per trial as their controls, and only 18 controls had to be re-run.

---

### T2.11 `AGENTS.md` as the start surface: lean set without `aspire-orchestration`

Added 2026-11-18 at the user's request, from [T2.10](#t210-results). Not a source build: a revised placed
file and one skill removed from a set.

| | |
|---|---|
| Hypothesis | On `cold-start` the lean set's only visible effect is to load `aspire-orchestration` (23 KB body, 6/6 luna and terra trials in `t16` and `t210`), and luna takes 61 s against raw's 45 s and `aspire-cli`'s 51 s (`t16`). T2.10's file took `aspire-lean-agents` to 53 s with the skill still loading, and `aspire-cli-agents` to 53 s with no skill at all. The start job is three commands in order: `aspire start`, then `aspire describe` (it names every resource with state, health and endpoints, so it is the list to wait on), then `aspire wait <resource-name>` for each resource the task needs. If the file carries those three lines in that order, the orchestration skill is a per-start tax on this scenario and can leave the lean set; the file becomes the push surface for the start flow that T1.6's `aspire-start` skill supplied by pull (53 s luna in `t16`). This is the scenario `aspire start` exists for, so the measure is the time to a started app whose resources the agent has verified up, not the end of the trial |
| Change | **File v2** (`common/agents-md/*.md`, all three families so the T2.10 arms differ from v1 only here; bytes in the ledger; leak review repeated): the "Run it" section orders `aspire start … --isolated`, then `aspire describe` explained as the resource list, then `aspire wait <resource-name>` with the placeholder spelled out, one per resource needed. **Set `lean-noorch`** = `lean` minus `aspire-orchestration`, and the file's Skills list drops its line. **Arm** `aspire-lean-noorch-agents` |
| Arms | `cold-start`: `aspire-lean` (same-round control, because T2.10's 13–14 % cold-start gain was measured against `t16` controls and round drift was not excluded), `aspire-lean-agents` (file v2, skill kept), `aspire-lean-noorch-agents` (file v2, skill removed); `raw` and `aspire-cli` same-round on luna as the floor (terra floor from `t16`). The `t16` `aspire-lean-start` cell is the pull comparison |
| Cells | `cold-start` × luna, terra × 6 on the three lean arms (36); `raw`, `aspire-cli` × luna × 6 (12); guard `slow-sql` × luna × 6 on `aspire-lean-noorch-agents` (a set without orchestration is a changed route; `aspire-diagnose` owns the job, so passes must hold) |
| Measures | **Primary: seconds to verified-up**, from the trajectory: first model call to the first tool result that shows both the player page and the admin application serving (an `aspire wait` returning ready for each, a `describe` showing both running and healthy, or an HTTP 200 on both endpoints), with the commands to that point; added to `collect.py` as `seconds_to_verified_up` and `commands_to_verified_up` and computed for the `t16` and `t210` cold-start trials too. Also `agent_seconds`, tokens, characters read, skills loaded, and per arm: did `describe` precede the first `wait`, did `wait` name a resource that `describe` listed, how many waits |
| Decision rule | `ship` (drop `aspire-orchestration` from the lean proposal for the start job; the v2 file carries the start flow; the `aspire new` / `aspire agent init` issue is filed with the v2 text) if on luna `aspire-lean-noorch-agents` seconds-to-verified-up ≤ 0.85 × same-round `aspire-lean` (p < 0.10), its `agent_seconds` is within 10 % of same-round `aspire-cli`, tokens do not exceed `aspire-lean`'s, terra is not worse than `aspire-lean` by more than 10 % on either time measure, and the guard holds (`slow-sql` luna passes ≥ the pin's `aspire-lean` cell minus one). `revise` (keep the skill, ship the file) if the time clause holds but `aspire-lean-agents` with the skill kept is within 5 % of the no-orchestration arm: the gain is the v2 ordering, not the removal. `drop` if neither luna arm is ≥ 15 % faster to verified-up than same-round `aspire-lean`. Report, whatever the verdict, where the remaining gap to raw sits: the start command, the waits, or the model's own verification |
| Caveat | The README still names the start command (T2.10's caveat). The card decides the start job only: `aspire-orchestration`'s other jobs (port conflicts, file locks, restarts) are Phase 3's to audit, and `stuck-db` keeps its owner. `aspire wait` without a resource name is not assumed to exist on the pin; the file says to name one |
| Trials / cost | 36 + 12 + 6 = 54 ≈ $2 (cold-start trials cost $0.003 luna, $0.03 terra in `t16`; the guard ≈ $0.30) |
| Results | **ship** (2026-11-19, round `t211`, 54 trials, $0.73): on luna, lean without `aspire-orchestration` plus file v2 reached a verified-up app in 0.83× the same-round `aspire-lean` time (39.0 vs 46.8 s, p = 0.041), with 0.59× the tokens and `agent_seconds` level with `aspire-cli`. Terra 0.92×, the guard 6/6, and keeping the skill with the same file gained nothing on luna (0.94×). [Results](#t211-results) |

#### T2.11 rule, as computed (written 2026-11-19, before any `t211` result was read)

- **Files and arms.** v1 (`cli.md`, `lean.md`, `skills.md`) stays as T2.10 measured it: its tasks are pinned to
  suite `a69d80b`, and rewriting them would pool v1 and v2 trials in one cell, since cells key on skill content,
  not on the instructions file. v2 is new files for all three families plus the new set: `cli-v2.md` 746 bytes /
  182 tokens, `lean-v2.md` 1,298 / 319, `skills-v2.md` 1,283 / 318, `lean-noorch-v2.md` 1,188 / 293 (o200k). Only
  "Run it" changes, identically in all four: (1) `aspire start --apphost /app/apphost.cs --non-interactive
  --isolated`; (2) `aspire describe`, explained as the list of every resource with state, health and
  endpoints, "the resources to wait on"; (3) `aspire wait <resource-name>` for each resource the task needs,
  the name taken from that list, returning when healthy (the pin's default `--status healthy`; `aspire wait`
  requires a name on this pin, `aspire wait --help`). `lean-noorch-v2.md` drops the orchestration line. Arms:
  `aspire-lean-agents-v2` (lean + `lean-v2.md`) and `aspire-lean-noorch-agents` (set `lean-noorch` = lean minus
  `aspire-orchestration`, + `lean-noorch-v2.md`). The ledger records `agents_md` and `agents_md_bytes`.
- **Leak review of v2** (the T2.10 review stands for the unchanged lines): the new lines name no resource, no
  fault and no fix. On `cold-start` they give the reference repair's three commands in order (`start`, then
  `wait` per resource), but the workspace README already names the start command and both waits with the
  resource names (`aspire wait boardadmin`, `aspire wait bingoboard`), so v2 adds the order and the role of
  `describe`, not the answer. On `slow-sql`, `slow-redis` and `heldout-cache` the app is running at the start, and
  the new lines are about starting it.
- **Measure** (`collect.py`, Copilot CLI trajectories, cold-start only): `seconds_to_verified_up` runs from
  the first `model.call_start` to the `tool.execution_complete` of the call that supplies evidence for the
  second of `bingoboard` and `boardadmin`. Per resource, evidence is the first of: an `aspire wait` result
  "Resource '<name>' is healthy|up"; a `describe` result (table, JSON, or a spilled copy read back) with that
  resource `Running` and `Healthy`; a 2xx/3xx (the admin answers 302, its login redirect) from a curl/wget URL
  whose port a describe listed for it (raw: the image's fixed ports 15173 and 18080); for raw, also the start
  script's own checks ("OK: Player frontend", "OK: Admin portal"). `commands_to_verified_up` counts the tool
  calls up to that one. Per trial also: `waits`, `describe_before_wait` (an `aspire describe` started before
  the first `aspire wait`), and `wait_named_listed` (every wait named a resource an earlier result listed). The
  measure finds evidence in all 126 `t16` and `t210` cold-start trials, and their values are in
  `trials.jsonl` as history.
- **Cells:** round `t211`, Copilot CLI. `cold-start` × luna, terra × 6 on `aspire-lean`, `aspire-lean-agents-v2`
  and `aspire-lean-noorch-agents`; `raw` and `aspire-cli` × luna × 6; guard `slow-sql` × luna × 6 on
  `aspire-lean-noorch-agents`. The terra floor comes from `t16`; the pull comparison is `t16`'s
  `aspire-lean-start`.
- **Ratios:** medians over graded trials, same round; p = exact two-sided Mann-Whitney. Tokens = per trial
  `input_tokens + output_tokens`.
- **An arm "moves"** if on luna its `seconds_to_verified_up` ÷ same-round `aspire-lean` ≤ 0.85 with p < 0.10.
- **`ship`** if all hold:
  - `aspire-lean-noorch-agents` moves;
  - its luna `agent_seconds` ≤ 1.10 × same-round `aspire-cli` (faster counts);
  - its luna tokens ≤ same-round `aspire-lean`'s;
  - on terra it is ≤ 1.10 × `aspire-lean` on both `seconds_to_verified_up` and `agent_seconds`;
  - the guard holds: `slow-sql` luna passes ≥ the pin's revised-text `aspire-lean` cell (`t17-copilot`, 6/6)
    minus one, i.e. ≥ 5/6;
  - and `aspire-lean-agents-v2` is not within 5 % of it (v2-kept ÷ noorch > 1.05 on luna
    `seconds_to_verified_up`).
- **`revise`** (keep the skill, ship the file) if either arm moves and `ship` fails, naming the failed
  clause; this includes v2-kept within 5 % of noorch, where the gain is the v2 ordering, not the removal.
- **`drop`** if neither luna arm moves.
- **Gap to raw**, reported whatever the verdict. Split the noorch arm's and raw's time to verified-up into:
  model time before the start command; the start command; the waits or checks after it; the model's own
  verification after the last wait.
- A trial at the 900 s limit is a failure counted separately; a trial lost before the agent ran is re-run
  once. Expected spend ≈ $2 (54 trials).

#### T2.11 results

**Verdict: `ship`**, by the rule as computed; every clause holds:
- `aspire-lean-noorch-agents` moves on luna: 0.83× same-round `aspire-lean` to verified-up (39.0 vs 46.8 s,
  p = 0.041).
- Its luna `agent_seconds` is 1.02× same-round `aspire-cli` (48.3 vs 47.4 s).
- Its luna tokens are 0.59× `aspire-lean`'s (p = 0.009).
- Terra is 0.92× (p = 0.10) to verified-up and 0.95× (p = 0.26) on `agent_seconds`.
- The guard holds: `slow-sql` luna 6/6, against the 5/6 bar.
- The skill-kept arm is not within 5 %: v2-kept ÷ noorch on luna is 1.13 (p = 0.065).

The proposal is:
- drop `aspire-orchestration` from the lean set for the start job;
- the v2 file carries the start flow;
- the issue for `aspire new` / `aspire agent init` is drafted with the v2 text.

Round `t211` (Copilot CLI 1.0.99, suite `f3e0fd6`, tasks `da84ccf`, dataset `244cb13`), 54 trials: no
timeouts, no model-service 5xx, no infrastructure losses, every trial passed. Gates: local cold-start and
slow-sql fail → repair → pass on `lean-noorch`; `gate-t211` 3/3 reward 1. The v2 arm's skill content is the
control's (`lean a14396de6b87`); `lean-noorch` is `aa17c88617a8`.

| Model | Arm (`cold-start`, `t211`) | Pass | Verified-up s | Commands to it | `agent_seconds` | Tokens (k) | describe → wait | Run IDs |
|---|---|---|---:|---:|---:|---:|---|---|
| luna | raw | 6/6 | 28.0 | 4.5 | 36.8 | 58 | n/a | 2026111913750656 – 13753700 |
| luna | aspire-cli | 6/6 | 39.7 | 4.5 | 47.4 | 70 | 0/6 | 2026111913750640 – 13753688 |
| luna | aspire-lean | 6/6 | 46.8 | 8 | 53.0 | 152 | 0/6 | 2026111913743186 – 13746352 |
| luna | aspire-lean-agents-v2 | 6/6 | 44.2 | 8.5 | 58.3 | 182 | 0/6 | 2026111913743210 – 13746374 |
| luna | **aspire-lean-noorch-agents** | 6/6 | **39.0** | 6.5 | **48.3** | **89** | 5/6 | 2026111913750638 – 13753826 |
| terra | aspire-lean | 6/6 | 39.8 | 6 | 49.8 | 125 | 0/6 | 2026111913743202 – 13746304 |
| terra | aspire-lean-agents-v2 | 6/6 | 35.2 | 7 | 44.1 | 115 | 6/6 | 2026111913743170 – 13746244 |
| terra | **aspire-lean-noorch-agents** | 6/6 | **36.8** | 5 | 47.5 | **84** | 6/6 | 2026111913750660 – 13753922 |

Guard: `slow-sql` luna `aspire-lean-noorch-agents` 6/6, 104 s, 0.35 M tokens, `aspire-diagnose` 6/6
(2026111913757908 – 13761110), against `t17-copilot` lean 6/6, 125 s. "describe → wait" counts trials where an
`aspire describe` started before the first `aspire wait`. In the noorch arm every such wait named a resource an
earlier result had listed, on luna 5/5 and terra 5/6.

**Mechanisms.**
- **The orchestration skill overrides the file's order.** With the skill kept, luna loaded it 6/6 and none
  of its trials ran `describe` before `wait` (0/6). Without the skill, 5/6 followed the file (describe, then
  a wait per listed resource). Terra followed the file either way (6/6). The skill-kept arm also carries the
  skill's 23 KB body: luna read 29 k characters against 20 k without it, and tokens 1.19× lean against 0.59×.
- **Where the time goes** (median phases, luna, seconds: model time before the start command / start
  command / waits until verified-up / model time after):

  | Arm | Before start | Start | Waits | After |
  |---|---:|---:|---:|---:|
  | `aspire-lean` | 11.9 | 14.7 | 19.7 | 6.0 |
  | noorch | 5.5 | 15.7 | 18.6 | 3.7 |
  | `aspire-cli` | 6.2 | 14.3 | 20.7 | 4.4 |
  | raw | 6.9 | 22.0 | 0 | 5.1 |

  The noorch gain over `aspire-lean` is the model's own time: no skill to read before starting (11.9 → 5.5 s)
  and less checking afterwards. The gap to raw (39.0 vs 28.0 s) is not the model. Before the start command,
  noorch is faster than raw (5.5 vs 6.9 s). The gap is the 34 s from the start command to verified-up, against
  raw's `scripts/start.sh`, which checks both origins itself and returns at 22 s. This was first read as `aspire
  start` returning before the resources are healthy, plus the waits; T2.2 ([results](#t22-results), 2026-11-19)
  showed that a blocking start closes none of it. The 34 s is Aspire's own time to a healthy app: the AppHost
  launch (15–20 s) and resource start-up (14–19 s), which the waits only overlap. This verdict (on the file and
  the skill) is unaffected: the remaining gap is neither a skill nor a file change.
- **A removed skill leaves a dangling name.** Two of six luna noorch trials called `skill aspire-orchestration`,
  and the call failed (the skill is absent). The name comes from `aspire-diagnose`'s description ("DO NOT USE
  FOR: starting or stopping the app (aspire-orchestration)"). `collect.py` lists a failed call in
  `skills_loaded`, which is why the table's source shows 2/6. If the skill leaves the set, that line should
  name the file or `aspire start` instead.
- **T2.10's cold-start gain was round drift.** Same-round `aspire-lean` took 53.0 s on luna in `t211`, against
  61.2 s in `t16`. Against it, the file with the skill kept is level (v2: 0.94× to verified-up, p = 0.73;
  1.10× on `agent_seconds`). The 13–14 % T2.10 measured against `t16` is therefore not the file's.
- **Against the pull skill.** `t16`'s `aspire-lean-start` (lean + `aspire-start`) reached verified-up in
  40.2 s on luna; noorch 39.0 (0.97×, p = 0.49). The push file matches the pull skill without a skill load.

**History** (`seconds_to_verified_up` now in `trials.jsonl` for all 126 `t16` and `t210` cold-start trials,
luna medians): `t16` raw 33.3, `aspire-cli` 41.3, `aspire-lean` 48.3, `aspire-lean-start` 40.2,
`aspire-skills` 47.9; `t210` lean-agents (v1) 40.1, cli-agents 40.1, skills-agents 42.7.

**Cost** $0.73 for 54 trials (gates $0.00), against ≈ $2 estimated: cold-start trials are short.

---

## 7. Phase 3: bottom-up audit of the shipped skills

The question for each skill is not "is it good advice" (the upstream vally evals judge
that) but "**when its job is the task, does loading it make a live-system outcome faster,
cheaper or more reliable than the CLI alone, and does it get selected without stealing
other prompts**". Every card uses the same design.

**Arms per scenario:** `raw` where a raw equivalent exists, `aspire-cli` (no skill),
`skill-only` (that skill alone), `bundle` (v0.0.6), `bundle-minus` (v0.0.6 without that
skill). **Cells:** the skill's scenario(s) × luna, terra × 6. **Metrics:** selection rate
on its own prompts, false selection on the other skills' prompts (from T3.9), references
read, pass rate, time and tokens against `aspire-cli`. **Verdicts:** `keep`, `shrink`
(body or references), `split` (one trigger, several jobs), `merge`, `remove`, or
**`no verdict`** when the harness cannot exercise the job. A `no verdict` is recorded as
such, not as "keep".

Scenario sources: the 13.6 fixtures already gated in this repo are ported to main and
their raw arms stripped of check scripts (F24) before use.

**Guards in this phase.** A `bundle-minus` arm is a changed route for every other prompt,
so the two skills whose removal would change the diagnosis route (`aspire-orchestration`,
`aspireify`, the largest bodies) also run their `bundle-minus` arm on luna `slow-sql` and
`slow-redis` × 6 (24 trials ≈ $0.40). The router's removal is already guarded in T1.3.

| Card | Skill (v0.0.6 size, references) | Jobs it claims | Scenario(s) and source | Can the harness exercise it? | Trials / cost | Results |
|---|---|---|---|---|---|---|
| T3.1 | `aspire-orchestration` (22 KB, 5 refs) | start/stop/wait, resource restart, file locks, port conflicts, worktrees, VS Code sessions | `cold-start`; **restart-after-change** (edit one project, restart only it, verify); **two-app isolation** (port of S01: two apps up, repair one); **port conflict** (a stray process holds the app's port) | Yes for the four; VS Code flows: `no verdict` | 4 × 5 × 2 × 6 = 240 ≈ $9.70 | pending |
| T3.2 | `aspireify` (21 KB, 10 refs) | wire an AppHost for an existing repo, add Postgres/Redis/Rabbit/Mongo, ServiceDefaults, TS toolchain repair | **Adoption** (port of A01: raw Bingo, add an AppHost that runs it; grader: live app under Aspire, source unchanged); **add a dependency** (add Redis to an existing AppHost and use it from one project) | Yes; TS toolchain repair: `no verdict` | 2 × 4 × 2 × 6 = 96 ≈ $3.90 | pending |
| T3.3 | `aspire-init` (10 KB, 2 refs) | `aspire new` / `aspire init`, pick a template, hand off to `aspireify` | **Greenfield** (empty folder, "create an Aspire app with an API and Postgres and run it"; grader: `aspire describe` shows the resources healthy and the API answers) | Yes | 1 × 4 × 2 × 6 = 48 ≈ $1.90 | pending |
| T3.4 | `aspire-deployment` (18 KB, 7 refs) | publish/deploy to Compose, Kubernetes, Azure, AWS, Radius; teardown | **Preconfigured publishing** (port of the P01 preconfigured pair: complete AppHost and raw Compose, "publish and run the production build locally"); Kubernetes and clouds: `no verdict` | Compose yes; others no | 1 × 5 × 2 × 6 = 60 ≈ $2.40 | pending |
| T3.5 | `aspire-monitoring` (14 KB, 3 refs) | observe logs/traces/metrics, export, standalone dashboard, browser telemetry, deployed-app routing | Its diagnosis claim is already measured (REPORT §4, T1.2). Add its **own** job: **export** ("export the last 10 minutes of traces and logs to files for a bug report"; grader: files exist with the incident's spans) | Export yes; browser telemetry and deployed routing: `no verdict` | 1 × 4 × 2 × 6 = 48 ≈ $1.90 | pending |
| T3.6 | `aspire-terminals` (10 KB, 4 refs) | `WithTerminal`, REPLs, tapes, terminal CLI | No live-outcome scenario fits the harness | **`no verdict`** on outcome; selection only (T3.9) | 0 | Done 2026-11-19, [T3.6 results](#t36-results): `no verdict` on outcome; selection clean on terra (12/12 own, 0/106 other), luna 10/12 own (descriptive) |
| T3.7 | `aspire-project-v2-migration` (14 KB, 2 refs) | migrate `AddProject` to `DotnetProjectResource` APIs with assessment and approval | **Migration** (an AppHost with three `AddProject` calls; "assess and migrate to the v2 project APIs"; grader: builds, starts, same resources healthy, same endpoints) | Yes, single-turn means the "explicit approval" step is pre-granted in the prompt | 1 × 4 × 2 × 6 = 48 ≈ $1.90 | pending |
| T3.8 | `aspire` router (21 KB, 2 refs) | detect AppHosts, guardrails ("investigate before editing", "never edit `.aspire/modules`"), route | Its routing cost is T1.3. Its guardrail job: **guardrail scenario** ("the db container looks stuck, restart it" on an app whose database holds unsaved state; grader: state preserved, no `docker rm`, no `aspire stop` of the whole app). Arms: `bundle`, `bundle-minus` (no router), `lean` | Yes for this one guardrail; the others: `no verdict` | 1 × 3 × 2 × 6 = 36 ≈ $1.50 | Done 2026-11-18, [T3.8 results](#t38-results): every arm 6/6 on both models, no destructive command in 48 trials; guardrail job `remove` (ceiling caveat) |
| T3.9 | **Selection benchmark** (all skills) | | Runs against a **static copy of the Bingo workspace** (files present, nothing running) so the model sees what it would see in a trial, and the run is stopped after the first skill load or first command. Prompt set: **6 prompts per skill's claimed jobs** (48), the suite's own diagnosis and cold-start prompts (4), and 12 non-Aspire distractors; 2 runs each on luna and terra. Record the first skill loaded. **Calibration before use:** on the shipped bundle it must reproduce the rates the full trials measured (router first in 14 of 18 luna `aspire-skills-mcp` diagnosis trials; `aspire-diagnose` 27 of 27 in `aspire-lean`) within a binomial 90% interval, or it is not used as a proxy. Reuse the upstream `grade-routing-entry.mjs` prompt set where it overlaps | Yes | 64 prompts × 2 models × 2 runs = 256 short runs ≈ $2 | Done 2026-11-18, [T3.9 results](#t39-results): **usable as a proxy on terra, not on luna** (luna picks the router first in 17/18 static runs against 9/18 same-pin trials; on the card's v0.0.5 figure, 14/18, it would pass); terra matrix clean except router ↔ orchestration on run/restart prompts; 0/48 distractors; $5.84 |

Decision rules for the audit, applied per skill after its cells and T3.9:

| Observation | Verdict |
|---|---|
| Selected on ≥ 10 of its 12 own-prompt runs per model, on ≤ 2 of 12 runs of other skills' prompts, and `skill-only` beats `aspire-cli` on time or pass rate with p < 0.05 on luna | `keep` |
| Beats `aspire-cli` but reads ≥ 2 references per trial on the main path | `shrink`: move the main path into the body |
| Selected on ≥ 3 of 12 runs of other skills' prompts | `split` or narrow the trigger; re-run T3.9 only |
| `skill-only` **equivalent** to `aspire-cli` on every cell: median ratio within ±10% and its bootstrap 90% interval inside ±25% on time, no pass-rate difference, **and** `bundle-minus` not worse than `bundle` by more than 10% on time or one trial on pass rate | `remove` from the default set (keep the content as docs) |
| `skill-only` not better than `aspire-cli` but the interval does not fit inside ±25% (luna's within-cell spread reaches 30%) | `no verdict`; add 6 trials or stop |
| Two skills selected interchangeably on the same prompts | `merge` |
| Harness cannot exercise the job | `no verdict`; say what harness would |

#### Phase 3 rulings (coordinating session, 2026-11-19, written before any Phase 3 trial)

These settle what the cards and the audit's decision table leave open, so that no lane has to ask for a ruling
after its results exist (two Phase 2 rulings reached their lanes after the results had been read, because messages
to a session in mid-turn queue until the turn ends). A lane that still needs a ruling asks for it and ends its turn
before reading any result of the round concerned.

1. **Arms and names.** Per scenario: `raw` where a raw equivalent exists (else the cell is `no-raw`), `aspire-cli`,
   `aspire-skill-<short>` (that skill alone: `skill-only`), `aspire-skills` (the v0.0.6 bundle), and
   `aspire-skills-no<short>` (the bundle minus that skill: `bundle-minus`, after `aspire-skills-norouter`). Short
   names: `orchestration`, `aspireify`, `init`, `deployment`, `monitoring`, `migration`. New skill sets are new
   `compose.sh` sets; no existing set or file changes.
2. **Keep rule, quantified.** The time clause is tested per scenario cell on luna: `skill-only` ÷ `aspire-cli`
   median ≤ 0.90 with exact Mann-Whitney p < 0.05 (the card's bar, stricter than the suite's p < 0.10, stands). The
   pass-rate clause is Fisher's exact test, p < 0.05, on the cell (at n = 6 only 6/6 against ≤ 1/6 meets it) or on
   the skill's scenarios pooled. `keep` needs one scenario that meets either clause, the same direction (ratio
   < 1.00, no fewer passes) on the skill's other scenarios, and no scenario where `skill-only` is worse than
   `aspire-cli` by more than 10 % on time (p < 0.10) or by two passes; a worse scenario sends the card to the
   `shrink` / `no verdict` rows. The number of cells tested is stated with the verdict.
3. **Selection columns.** Terra: read from T3.9's matrix as measured (the `aspire-skills` arm is v0.0.6 unchanged, so
   no recalibration). Luna: the own-prompt rate is the first skill loaded in the `aspire-skills` arm's luna trials on
   the skill's own scenarios (≥ 5/6 per scenario stands in for ≥ 10/12); luna false selection is not evaluable
   (T3.9's luna matrix is descriptive only, by its own rule), so a `split` or `merge` verdict may rest on terra's
   matrix alone and says so.
4. **T3.1 and cold start.** T2.11 decided the start job (`AGENTS.md` v2 replaces `aspire-orchestration` for it).
   T3.1's verdict rests on restart-after-change, two-app isolation and port conflict; the cold-start cells run (five
   arms, cheap) and are reported as the same-round tie to T2.11, not as decisive cells.
5. **`bundle-minus` guards** (T3.1 and T3.2, luna `slow-sql` and `slow-redis` × 6, same round as the card). The
   shipped set passes luna `slow-redis` 0/36 at this pin, so the pass-rate clause cannot fail there: that guard is
   time-only (`bundle-minus` not slower than `aspire-skills` by more than 10 %, p < 0.10); `slow-sql` keeps both
   clauses (passes ≥ bundle − 1, time within 10 %). Pass counts are recorded regardless.
6. **Top-ups.** "Add 6 trials or stop" means one top-up per card at most, both arms (`skill-only` and `aspire-cli`)
   in one new round, pooled with the first round only when the `aspire-cli` medians of the two rounds lie within
   15 % of each other; otherwise the rounds are reported apart and the card ends `no verdict`. The top-up stays
   inside the 3× stop (stop and report before any submission that would take a card past 3× its estimate).
7. **New scenarios** (restart-after-change, two-app isolation, port conflict, adoption, add a dependency, greenfield,
   preconfigured publishing, export, migration): the agent may have to restore packages or templates for the daily
   build inside a CES trial, which no scenario so far has needed. Each fixture's first check is that restore works
   on CES (preferably by vendoring the feed into the image at build so a trial never reaches the network for it);
   then a two-trial `aspire-cli` pilot per scenario on luna and terra, round `p3-pilot-<scenario>`, excluded from
   every table like the T3.9 probes, sets the price per trial, the duration against the 900 s limit and whether the
   scenario sits at a floor or a ceiling. Any timeout multiplier is fixed before data and is the same for every arm.
   Fixtures ported from the 13.6 experiments (A01 `bingo-adoption`, S01 `bingo-isolation`, P01 `bingo-publishing`)
   lose their raw arms' check scripts (F24) before use. T3.7's approval step is pre-granted in the prompt, as the
   card says.
8. **Shared tooling has one owner.** The orchestration lane lands, first and before its own fixtures: the
   `skill-only` and `bundle-minus` sets in `compose.sh` for all six skills under the names above; a
   `references_read` metric in `collect.py` (paths under a skill directory other than `SKILL.md`, from
   `harness_paths_read`); and the bootstrap 90 % interval of the time ratio in `stats.py` that the `remove` row
   needs. The other lanes build fixtures meanwhile and pull before their first re-pin.
9. **Jobs the harness cannot exercise** are `no verdict` rows that name the harness that could (an interactive
   terminal for `aspire-terminals`, a VS Code session for orchestration's editor flows, a cluster or cloud for
   deployment's other targets); never `keep`.
10. **Cost.** The seven remaining cards sum to ≈ $22 at the cards' estimates; luna and terra have run at about 2×
    those per trial on diagnosis scenarios and the authoring scenarios' prices are unknown until the pilots, so ≈ $45
    is the expectation. Nothing is filed upstream; Docker gate artifacts are removed as soon as a round closes.

#### T3.6 results

**Verdict: `no verdict` on outcome** (2026-11-19, no trials: the harness cannot exercise `WithTerminal`, REPLs or
tapes in a single-turn, non-interactive trial; an interactive terminal harness driving a REPL resource could). Selection
column from T3.9 (`t39-mat`, shipped set v0.0.6, 2 runs per prompt and model): terra, calibrated, own prompts 12/12,
other skills' prompts 0/106, distractors 0; luna, descriptive only, own prompts 10/12 (both misses loaded the router),
other prompts 0/108. Nothing in the selection data argues for `split` or `merge`; the body's size (10 KB, 4
references) is not weighed without an outcome cell. $0.

#### T3.1 fixtures and rule, as computed (written 2026-11-19, before any T3.1 trial or pilot)

**What the pinned daily does, measured locally before the fixtures were written** (official CLI
`17.1.0-preview.1.26567.3`, the aspirified Bingo image):
- `boardadmin` (a C# project resource) exposes `rebuild` ("Stop the resource, rebuild the project from source, and
  restart") and `restart` ("Source code is not recompiled"). `rebuild` applied a source change in 4.4 s; the AppHost,
  the Vite process and both containers kept their identity.
- **File locks cannot occur here:** `dotnet build` of the admin project while it runs succeeds on Linux (no
  MSB3491/CS2012). The skill's file-lock recovery is therefore not exercised by any scenario (row below).
- `--isolated` randomizes every port, including the launch profile's 5039 and an endpoint pinned in the AppHost
  (`WithEndpoint("http", e => e.Port = 15173)` came up on 33415). **354 of 354** cold-start Aspire trials at this
  pin started with `--isolated` (the README says so). Under a plain `aspire start` a process already on 5039 makes
  DCP fail to bind the admin's proxy with one INFO line ("Could not use the same port for all addresses associated
  with requested service address"), while `aspire describe` still advertises `boardadmin` at `http://localhost:5039`.
- Two AppHosts side by side: from `/app` an unscoped `aspire describe` targets `/app`'s AppHost; from `/` it refuses
  ("Multiple running AppHosts were found … Pass --apphost").

**Arms** (ruling 1): `raw`, `aspire-cli`, `aspire-skill-orchestration` (`skill-only`), `aspire-skills` (`bundle`),
`aspire-skills-noorchestration` (`bundle-minus`) on every scenario. Each scenario has a raw reference repair that
passes its verifier, so `raw` runs everywhere (reported; the verdict compares `skill-only` with `aspire-cli`).

**Scenarios** (faults in `common/bench/bench.mjs`; every check recorded in `details.json`; pass = reward 1 = all
checks):
- **`cold-start`** (existing): reported as the same-round tie to T2.11, not decisive (ruling 4).
- **`restart-change`** (the card's restart-after-change, renamed to keep benchmark names ≤ 61 characters): the app
  is running, tonight's three squares (`night-*`, which live traffic never touches) are called. Prompt: add
  `calledCount` to `GET /api/demo/producer/status` and put it live now, keeping the player site, database and cache
  running; restart only what the change needs.
  - Checks: `live` (a fresh square called then cleared: `calledCount` equals the number of called squares both
    times and drops by one), `keptRunning` (Vite process pid + start time, the Postgres and Redis containers' id +
    start time, and on Aspire the AppHost's pid + start time, all as at setup), `gameKept` (tonight's squares still
    called). Recorded: whether the admin process was replaced.
  - Reference repairs: Aspire `aspire resource boardadmin rebuild`. Raw: the supervisor (`scripts/start.sh`) stops
    the frontend and both containers when the admin exits, so it is ended without its cleanup (SIGKILL), then the
    admin is rebuilt and relaunched with its own environment.
  - Local gates (both kinds): fail → repair → pass. Negatives: Aspire `restart` without a build fails `live`; a
    full `aspire stop` + start fails `keptRunning` and `gameKept`; `dotnet build` + `restart` passes. Raw: build,
    kill the admin, `start.sh` fails `keptRunning` (containers restarted). Restore check: the Aspire repair passes
    with egress rejected (`iptables … REJECT`): the rebuild never reaches a feed.
- **`two-app`** and **`port-conflict`**: fixtures gated locally; their fault and README are **pending the
  coordinating session's ruling** (sent 2026-11-19 before any pilot). They get their own re-pin and their design
  is written here before their pilots.

**Guard** (ruling 5): `aspire-skills-noorchestration` and `aspire-skills` on luna `slow-sql` and `slow-redis` × 6, same
round (48 trials: the card's 24 plus the same-round `aspire-skills` control).

**Rounds.** Pilots (ruling 7): `aspire-cli` × luna, terra × 2 per new scenario, rounds `p3-pilot-<scenario>`, ledger
`excluded`. No agent-timeout multiplier: 900 s for every arm (written now; if a pilot shows a scenario near the
limit, that is reported before the round, not changed after it). Oracle gates `gate-t31` (every task). Round
`t31`: 4 scenarios × 5 arms × luna, terra × 6 (240) plus the guard (48), submitted together.

**Rule, applied in this order** (§7 table, rulings 2–6, 9). Decisive cells: `restart-change`, `two-app`,
`port-conflict` (ruling 4), each × model; `skill-only` = `aspire-skill-orchestration`.
1. **Floor.** A cell where `skill-only` and `aspire-cli` both pass ≤ 1/6 is reported, not tested. If all three luna
   cells are floors, the card is `no verdict`.
2. **`keep`**, luna only (ruling 2):
   - one decisive scenario where `skill-only` ÷ `aspire-cli` median time ≤ 0.90 with exact Mann-Whitney p < 0.05,
     or Fisher's exact test on pass counts p < 0.05 (the cell, or the three scenarios pooled);
   - the same direction (ratio < 1.00, no fewer passes) on the other two;
   - no decisive luna scenario where `skill-only` is slower by > 10 % (p < 0.10) or passes two fewer;
   - selection (ruling 3): terra from T3.9 (`aspire-orchestration` 11/11 own; other skills' prompts: see below);
     luna: the first skill loaded in the luna `aspire-skills` trials is `aspire-orchestration` in ≥ 5/6 per decisive
     scenario, else the card goes to row 5 and says so;
   - **`shrink`** instead of `keep` if `skill-only`'s median count of `aspire-orchestration` files read
     (`references_read_paths` under `aspire-orchestration/`) per trial on the cells that meet the clause is ≥ 2.
3. **Worse.** A decisive luna scenario where `skill-only` is slower by > 10 % (p < 0.10) or passes two fewer makes
   the card `shrink` when the trajectories show the cost comes from the body or references on the main path, and
   `no verdict` otherwise.
4. **`remove`**, all of: on every decisive cell (both models) `skill-only` ÷ `aspire-cli` median within 0.90–1.10,
   bootstrap 90 % interval inside 0.75–1.25, pass counts within one; `aspire-skills-noorchestration` ÷
   `aspire-skills` on every decisive cell not slower by > 10 % and not more than one pass fewer; the guard: luna
   `slow-sql` not slower by > 10 % (p < 0.10) and passes ≥ bundle − 1, luna `slow-redis` time only. A failing
   guard or bundle-minus cell makes the card `no verdict` with that cell named.
5. **`no verdict`** otherwise; at most one top-up (ruling 6).
6. **`split`**: terra's T3.9 matrix. `aspire-orchestration` was selected on 6 of 107 runs of other skills' prompts,
   all six on prompts labelled as the router's (`router-3`, `-5`, `-6`, two runs each). Reading (a), pending the
   coordinating session's ruling: those are run/restart jobs orchestration's own description claims and the
   router's removal ships (T1.3), so false selection is counted on the seven other skills' prompts (0 of 96) and
   `split` does not fire; reading (b) counts them (6 ≥ 3 → `split`/narrow, re-run T3.9 only).
7. **Rows the scenarios do not exercise** (ruling 9), `no verdict`: VS Code lifecycle tools and their stop-result
   matrix (`aspire_apphost_start`/`_stop`, `notEditorOwned`, `ambiguousSession`: a VS Code session with the Aspire
   extension's tools, which T0.4's adapter does not load); file-lock recovery (MSB3491/CS2012: a Windows harness,
   where a running assembly is locked); git-worktree isolated starts (a fixture whose `/app` is a `git worktree`;
   the trial workspace is a plain checkout); `aspire update --self/--migrate`, integration discovery, default watch.

**Recorded per trial, read from the trajectories, not graded:** `rebuild` / `restart` / `dotnet build` / `aspire
stop` of the AppHost / `kill` of an app process (`restart-change`); the skill's references read; and, once ruled,
`--apphost` scoping and commands naming the neighbor (`two-app`), `aspire stop` before a new start (the skill's
"port already in use → stop, then restart" row), `--isolated`, a launch-profile edit, and any signal sent to the
preview process (`port-conflict`).

**Cost.** Card 240 + 24 ≈ $10.10; with the same-round guard control 288 trials. At the Phase 2 rates (≈ 2×) the
expectation is ≈ $20; the 3× stop is $30.30.

#### T3.2 and T3.3 fixtures and rules, as computed (written 2026-11-19, before any T3.2 or T3.3 trial)

**Shared fixture (authoring lane).** Template `tools/templates/Dockerfile.authoring` (same toolchain pins as the
Bingo template; stage chosen by `FAULT`), scripts `common/authoring/`, verifier and reference solution in each task's
`tests/` and `solution/` (`tools/authoring/`), never in the image (F26).
- **Restore (ruling 7).** The daily feed floats: on 2026-11-19 `aspire new` on the pinned CLI resolved templates
  `17.1.0-preview.1.26568.1`, a newer daily than the pin. The image therefore vendors every `Aspire*` package
  published at `17.1.0-preview.1.26567.3` (141 ids, `common/authoring/aspire-packages.txt`: all but the CLI binaries
  and non-Linux DCP/dashboard packages) into `/usr/local/aspire/packages` and points the CLI at it with its install
  sidecar (`.aspire-install.json`, `packages`). `aspire new`, `aspire init`, `aspire add` and restore then resolve
  `Aspire*` from disk at the pin. The NuGet global packages folder is warmed at build (starter template, file-based
  AppHost with Postgres/Redis/JavaScript, Postgres/Redis client integrations; agent init suppressed, nothing left
  behind). nuget.org stays reachable for everything else, as in every trial so far.
  - **Local proof:** with `pkgs.dev.azure.com` blackholed, all six local gates (three scenarios × two solution shapes)
    pass, each pinned.
  - **CES proof:** the oracle gate of each scenario (`gate-p3a`), whose solution creates, restores and starts the
    AppHost inside a CES trial.
  - **Cost of the sidecar:** the CLI prints "Aspire CLI is emulating identity 'daily' version …" on stderr before
    every human-readable command. Same text in every arm; trajectories are read for reactions to it.
- **Product behaviour kept as is:** `aspire new` / `aspire init` run agent init. They write
  `.github/copilot/settings.json` enabling the `aspire@aspire-skills` plugin in the generated project, and
  user-level hooks `~/.copilot/hooks/aspire-telemetry.json`. Every `aspire-cli` trial that loads any skill is
  counted and reported; if two or more trials of an `aspire-cli` cell do, that cell is flagged in the verdict.
- **Recorded per trial, not graded:**
  - `details.json`: each check, the AppHost path, the AppHost's `sdkVersion` from `aspire ps` and `pinned`;
    adoption also gets the files that only gained lines and the files changed.
  - A trial whose AppHost runs another Aspire version (the agent pinned one itself) counts as it is and is listed.
- **Pass = reward 1** (the conjunction below). **Time** = agent seconds over every trial that is not an
  infrastructure failure, passed or not (as `stats.py` computes it). Timeouts count as failures at their duration.
- **Approval** the skills ask for ("propose, confirm with user", "ask before modifying service code") is pre-granted in
  every prompt, as for T3.7.
- **Pilots (ruling 7):** two `aspire-cli` trials per scenario on luna and on terra, rounds `p3-pilot-adoption`,
  `p3-pilot-add-dependency`, `p3-pilot-greenfield`, ledger `excluded`. They set the price per trial, the duration
  against the 900 s limit, and whether a scenario sits at a floor or a ceiling. Any agent-timeout multiplier is
  written here after the pilots and before the round, and is the same for every arm and both models of a scenario.

**Scenarios.**
- **`adoption`** (T3.2; port of A01): the raw Bingo app with its own launcher, no AppHost, nothing running. The
  overlay has no check script (F24).
  - Prompt: add an AppHost that runs the whole app under Aspire, start it, leave it running. Resources `boardadmin`
    and `bingoboard`. Existing lines must not change (adding files and lines, e.g. service defaults, is fine).
  - Reward checks:
    - `aspire`: a running AppHost (`aspire ps`) whose `boardadmin` and `bingoboard` are Running, not Unhealthy,
      with HTTP endpoints.
    - `dependencies`: exactly one Postgres and one Redis container, both AppHost resources.
    - `oneBackend`: exactly one admin backend process, holding `ConnectionStrings__db` and `__cache`.
    - `seeded`: the admin user and squares are in its database.
    - `functional`: login page, player page, the player's API and SignalR proxies, a fresh square import reaching
      Postgres, call/clear/status. Redirects to the HTTPS endpoint are followed.
    - `sourcePreserved`: every file of the handed-over tree keeps every original line in order. `NuGet.config` and
      `package-lock.json` are exempt.
  - Local proof: the source rule fails an edited line and passes an added one.
  - Measured locally: `aspire init --language csharp` writes a plain-SDK AppHost project with versioned
    `PackageReference`s, which this repo's central package management rejects (NU1008). `aspire add postgres` has no
    exact match in non-interactive mode. Both are part of the job and the same in every arm.
- **`add-dependency`** (T3.2): the aspirified Bingo app without Redis. Variant `common/authoring/add-dependency`:
  the admin backend uses `AddDistributedMemoryCache`, no SignalR backplane. The app is running under Aspire at start.
  - Prompt: add Redis to the AppHost and make `boardadmin` keep its distributed cache in it; keep data and
    functionality; leave it running.
  - Reward checks:
    - `aspire`: `boardadmin` and `bingoboard` live.
    - `redisResource`: exactly one Redis container, an AppHost resource, Running and Healthy.
    - `referenced`: `boardadmin` references it and receives `ConnectionStrings__<its name>`.
    - `usesRedis`: calling a fresh square writes the admin's `global_square_<id>` cache entry into that Redis.
    - `functional`: as adoption.
    - `dataPreserved`: every square present at setup is still in Postgres.
  - Measured locally: the Aspire client integration route needs the repo's
    `Microsoft.Extensions.Caching.StackExchangeRedis` raised from 10.0.12 to 10.0.15 (NU1605). The plain
    StackExchange route does not.
- **`greenfield`** (T3.3): `/app` holds only an empty `.github` folder in every arm. The skill arms' skills live in
  it, and `aspire new --output /app` refuses a non-empty folder, so every arm meets the same folder; measured locally,
  it would otherwise fail only in the skill arms.
  - Prompt: create an Aspire app with an ASP.NET Core API (resource `api`) using a PostgreSQL database (resource
    `db`), start it, leave it running, the API must answer on its endpoint.
  - Reward checks:
    - `aspire`: a running AppHost with a resource `api`.
    - `api`: Running, not Unhealthy, with an HTTP(S) endpoint.
    - `postgres`: exactly one Postgres container; `db` Running and Healthy; a healthy Postgres container resource.
    - `referenced`: `api` receives `ConnectionStrings__db`.
    - `answers`: any HTTP status below 500 from the API's endpoint.

**Arms and cells** (ruling 1, `no-raw`):
- T3.2: `aspire-cli`, `aspire-skill-aspireify`, `aspire-skills`, `aspire-skills-noaspireify` on `adoption` and
  `add-dependency` × luna, terra × 6 (96). In the same round, the guard (ruling 5): `aspire-skills` and
  `aspire-skills-noaspireify` on luna `slow-sql` and `slow-redis` × 6 (24).
- T3.3: `aspire-cli`, `aspire-skill-init`, `aspire-skills`, `aspire-skills-noinit` on `greenfield` × luna, terra × 6
  (48).
- Rounds `t32` and `t33`, with oracle gates first. Before each round the pilot price × trial count is compared with
  the 3× stop: T3.2 $12.90, T3.3 $5.70.

**Rule, applied per card in this order** (§7 table, rulings 2, 3, 5, 6, 9). "Cell" = scenario × model; `skill-only`
is `aspire-skill-aspireify` (T3.2) or `aspire-skill-init` (T3.3).
1. **Floor.** A cell where `skill-only` and `aspire-cli` both pass ≤ 1/6 is a floor. It is reported, not tested,
   and counts against neither direction. If every luna cell of a card is a floor, the card is `no verdict`
   ("the scenario does not let the CLI alone finish").
2. **`keep`** (ruling 2), luna only:
   - At least one scenario where `skill-only` ÷ `aspire-cli` median time ≤ 0.90 with exact Mann-Whitney p < 0.05,
     or where Fisher's exact test on pass counts gives p < 0.05 (on the cell, or on the card's scenarios pooled).
   - The same direction (ratio < 1.00, no fewer passes) on the card's other luna scenario.
   - No luna scenario where `skill-only` is slower by more than 10 % (p < 0.10) or passes two fewer.
   - Selection (ruling 3): terra from T3.9 as measured (`aspireify` 12/12 own, 0/106 other; `aspire-init` 12/12,
     0/106, both inside the rule). Luna: the first skill loaded in the luna `aspire-skills` trials is the audited
     skill in ≥ 5/6 per scenario. If it is not, the card cannot be `keep`: it goes to row 5 and the write-up says
     so. Luna false selection is not evaluable.
   - **`shrink`** instead of `keep` if `skill-only`'s median `references_read` per trial on the cells that meet the
     clause is ≥ 2.
3. **Worse.** If a luna scenario has `skill-only` worse by > 10 % time (p < 0.10) or by two passes, the card is
   `shrink` when the trajectories show the cost comes from the body or references read on the main path, and
   `no verdict` otherwise.
4. **`remove`**, all of these:
   - On every cell (both models), `skill-only` ÷ `aspire-cli` median within 0.90–1.10, its bootstrap 90 % interval
     inside 0.75–1.25, and pass counts within one of each other.
   - `aspire-skills-no<short>` ÷ `aspire-skills` on every cell of the card: not slower by more than 10 % and not
     more than one pass fewer.
   - For T3.2, the guard: luna `slow-sql` not slower by > 10 % (p < 0.10) and passes ≥ bundle − 1; luna
     `slow-redis` time only (ruling 5).
   - If the guard or a bundle-minus cell fails, the skill is not removable: the card is `no verdict` with the
     failing cell named.
5. **`no verdict`** otherwise. At most one top-up of six trials per arm (`skill-only` and `aspire-cli`) in one new
   round, pooled only if the two rounds' `aspire-cli` medians are within 15 % (ruling 6), and only inside the 3×
   stop.
6. **Rows the scenarios do not exercise** (ruling 9), recorded as `no verdict`:
   - T3.2: TypeScript AppHost toolchain repair, Go, Rabbit/Mongo. The same harness with a TS AppHost fixture whose
     package-manager toolchain is broken would exercise the first.
   - T3.3: the `aspire init` hand-off is covered by `adoption` only through `aspireify`'s cells; template choice
     beyond the starter is not graded.
   - `split` / `merge` rest on terra's T3.9 matrix, which shows neither for these two skills.

#### T3.9 design and calibration rule, as computed (written 2026-11-18, before any selection run)

- **Runs.** One scenario per prompt (`sel-<id>`, prompts in [`tools/selection-prompts.mjs`](tools/selection-prompts.mjs)), all on one image (`FAULT=selection`): the aspirified Bingo workspace as a trial sees it, nothing started, Docker up. A Copilot CLI policy hook (`/etc/github-copilot/policy.d/selection.json`, outside the workspace → [`common/bench/selection/pretool.sh`](common/bench/selection/pretool.sh)) lets file reads (`view`, `glob`, `grep`, `report_intent`, at most 12), the first `skill` call and up to three other calls run, then denies every call with "this session has ended", which ends the agent. Agent limit 300 s. The verifier only writes reward 1 and keeps the hook's log; there is no outcome.
- **Why three commands and not "first command".** In the trials the skill is often loaded in the second turn, after a `git status` or MCP call in the first (Copilot CLI batches calls): stopping at the first command would turn most shipped-set and terra loads into "none". Over the 264 graded Copilot CLI trials of `aspire-skills`, `aspire-skills-mcp`, `aspire-plus` and `aspire-lean` on the four suite scenarios (both pins, read from the model's tool requests), every first skill load came with at most two commands before it except three, all 11-09 luna `aspire-skills-mcp` (router after 6 commands, `aspire-monitoring` after 5 and 6); the 15 trials with no skill ran 18 or more commands without one.
- **Selected** = the first `skill` call the model makes with at most three commands before it, read from the model's tool requests (`assistant.message`), so a denied call still counts as asked; "none" otherwise. The calibration applies the same definition to the full trials' trajectories.
- **Prompt set.** 6 prompts per shipped skill (48; 40 reuse an upstream v0.0.6 stimulus — mostly the `should_trigger_*` routing cases — without the "invoke the matching skill" preamble the upstream harness adds, with names adapted to this workspace; 8 are new where upstream has nothing that fits the workspace, four of them the router's own jobs), the suite's prompts (3 distinct texts: `slow-sql` and `slow-redis` share one, so it is run twice as often), 12 non-Aspire distractors (5 upstream `should_not_trigger` cases, 7 new tasks on this workspace).
- **Calibration targets (primary): the same pin and bundle**, round `t01b` (v0.0.6, pin 2026-11-17), on the suite's prompts: luna `aspire-skills-mcp` diagnosis, router selected in 9 of 18 (`aspire-monitoring` 2, none 7); luna `aspire-lean`, `aspire-diagnose` 18 of 18; terra `aspire-skills-mcp`, `aspire-monitoring` 18 of 18; terra `aspire-lean`, `aspire-diagnose` 18 of 18; and on `cold-start` luna `aspire-skills-mcp` router 5 of 6, `aspire-lean` `aspire-orchestration` 6 of 6. The card's figures (router 14 of 18, `aspire-diagnose` 27 of 27) were measured on v0.0.5 (pin 2026-11-09) and are reported alongside, not used: the shipped set changed and so did its luna rate. The `lean` set now carries the step-1 revision of `aspire-diagnose` (suite `305a8ed`), including its description, which `t01b` did not.
- **Calibration runs** (round `t39-cal`): `aspire-skills-mcp` and `aspire-lean` × luna, terra × 18 runs on the diagnosis prompts (12 on the shared `slow-sql`/`slow-redis` text, 6 on `read-only`, as in the trials) and 6 on `cold-start`.
- **Rule.** A target passes when the trial rate lies inside the exact binomial (Clopper-Pearson) 90 % interval of the selection runs' rate. The benchmark is **usable as a proxy on a model** when both of that model's diagnosis targets pass; otherwise it is recorded as not usable on that model and its matrix is descriptive only (no Phase 3 verdict may rest on it). Cold-start targets are reported.
- **Matrix** (round `t39-mat`): every prompt × `aspire-skills` (v0.0.6, no MCP, the audit's `bundle`) × luna, terra × 2 runs (the shared suite prompt 4). **Extra** (round `t39-arm`): the 3 suite prompts × `aspire-skills-mon`, `aspire-skills-norouter` × luna, terra × 4 runs, for T1.2 and T1.3.
- Runs are recorded in `results/selection-ledger.jsonl` (`BENCH_LEDGER`), never in `ledger.jsonl`, and reported by `tools/selection.py` in `results/selection.md` / `selection.jsonl`, so no selection run enters `trials.jsonl`, a comparison cell or the series. A hook probe (`t39-probe`, 2 runs) precedes everything; if the hook does not fire under the pinned Copilot CLI 1.0.99, the fallback is the 300 s limit and the same trajectory reading.
- **Probe result, and the one change it caused (2026-11-18, before any calibration or matrix run).** The first design put the hook in the workspace (`/app/.github/hooks/session.json`, tasks `705f197`). Probe `t39-probe` (`2026111876600116` luna `aspire-lean` on the sluggish prompt, `2026111876602684` luna `aspire-skills` on `router-1`): both ran, the agent even listed the hook file, but Copilot never called it (empty hook log; the `aspire-lean` run went on for 13 model calls and 89 s). Under the eval driver repository hooks are not loaded (the folder is trusted for MCP sources only). Copilot CLI 1.0.99 does load `/etc/github-copilot/policy.d/*.json` with the same schema and no trust check (checked in a local container: "Loaded policy hooks from …"), and that directory is outside the workspace, so the agent cannot see it. The hook moved there; the `sel-*` tasks were regenerated (below) and the probe re-run as `t39-probe2`. Both probe runs selected what the full trials select (`aspire-diagnose`, router) and stay excluded.

#### T3.9 results

**Verdict: usable as a proxy on terra, not on luna** (by the rule as computed: both terra diagnosis targets pass, luna's router target fails). Rounds `t39-cal` (96 runs), `t39-mat` (256), `t39-arm` (48), 2026-11-18, tasks `6459e98` (suite `5909a0e`), Copilot CLI 1.0.99; the probes (`t39-probe`, `t39-probe2`) are excluded from every table. Oracle gate `gate-t39` `2026111876604986`, reward 1. Four runner exceptions, not re-run (`MSBenchAgentRunError` `2026111877704414`, `…78288840`, `…78358062`; `RuntimeError` `…78080608`), no model-service 5xx. The hook fired in every run that asked for a tool except the first probe pair (the 11 that did not ask for one are distractors answered in one message). Every run that selected a skill did so with at most two commands before it (229 with none, 98 with one, 6 with two), so the three-command limit never decided a selection. Median run 17 s. Run IDs: `results/selection-ledger.jsonl` (`t39-cal` `2026111877515370`–`…79057262`, `t39-mat` `…77776806`–`…78562814`, `t39-arm` `…77596358`–`…77762638`); per run: `results/selection.jsonl`; tables: [selection.md](results/selection.md).

| Target (round `t01b`, same pin and bundle) | Model | Trials | Selection runs, 90 % interval | Inside |
|---|---|---|---|---|
| router first, `aspire-skills-mcp`, diagnosis | luna | 9/18 (none 7, monitoring 2) | 17/18 (0.76–1.00) (none 1) | **no** |
| `aspire-diagnose` first, `aspire-lean`, diagnosis | luna | 18/18 | 18/18 (0.85–1.00) | yes |
| `aspire-monitoring` first, `aspire-skills-mcp`, diagnosis | terra | 18/18 | 18/18 (0.85–1.00) | yes |
| `aspire-diagnose` first, `aspire-lean`, diagnosis | terra | 18/18 | 18/18 (0.85–1.00) | yes |
| router first, `aspire-skills-mcp`, cold start (reported) | luna | 5/6 (orchestration 1) | 5/6 (0.42–0.99) | yes |
| `aspire-orchestration` first, `aspire-lean`, cold start (reported) | luna | 6/6 | 6/6 (0.61–1.00) | yes |

The card's own figures (router 14 of 18, `aspire-diagnose` 27 of 27) were measured on v0.0.5 and are not targets, as pre-registered, but reported here: **on them luna would pass** (14/18 = 0.78 lies inside the runs' 0.762–0.997; 27/27 inside 0.85–1.00). Luna fails only on the same-pin target chosen before the runs, because v0.0.6 lowered the router rate in the trials to 9 of 18 while the static runs stayed at 17 of 18.

**Against every trial of the pin (descriptive, not the rule).** Each suite-prompt cell against all graded Copilot CLI trials of pin 2026-11-17 in the same arm, model and scenario group (every round pooled; [selection.md](results/selection.md#every-suite-prompt-cell-against-all-trials-of-the-pin-descriptive)): 15 of 17 cells agree on the trials' most frequent first choice. Both misses are the router winning in the static runs where the trials split:

- luna `aspire-skills-mcp` diagnosis: trials router first 16 of 30 (`t01b` 9/18, `t17-copilot` 7/12; none 12, monitoring 2), runs 17 of 18;
- terra `aspire-skills-mon` diagnosis: trials 9 monitoring and 9 router first (`t12`), runs 8 of 8 router.

Where the router is absent or rarely wins, the runs match: `aspire-lean` 42/42 and 24/24 `aspire-diagnose`, luna `aspire-skills` without MCP (none 32 of 45 in four rounds against 3 of 5 runs), `aspire-skills-norouter` on both models (luna none 15/18 against 6/7; terra monitoring 11/12 against 8/8), every cold-start cell.

**Why the luna target misses: not determined.** Compared between `t01b` luna `aspire-skills-mcp` trials and static runs: the prompt text is identical, the `README.md` read is identical, and `git status` prints the same clean output; the first `glob` result is masked (`******`) in both artifacts, so it cannot be compared. The workspaces do differ in what is gitignored: a trial's later `rg` hit `/app/src/BingoBoard.Admin/obj/Debug/...`, build output from starting the app, which the static copy has not got (its setup neither builds nor starts anything), and the same holds for the AppHost's runtime state. At the point where 17 of 18 static runs loaded the router, the trial agents that did not called the MCP's `aspire-list_apphosts` or kept reading files; 1 of 18 static runs did. The policy hook is outside the workspace and silent until it denies a call, which happens only after a selection. Whatever the cause, it has a direction: **the proxy over-predicts the router** whenever the router competes for the job.

**Matrix, shipped set v0.0.6 without MCP (`aspire-skills`, 2 runs per prompt and model).**

| Skill | luna own | luna on other prompts | terra own | terra on other prompts |
|---|---:|---:|---:|---:|
| `aspire` (router) | 7/12 | 19/108 (aspireify 6, deployment 4, orchestration 4, init 2, terminals 2, monitoring 1) | 5/11 | 0/107 |
| `aspire-deployment` | 8/12 | 0/108 | 12/12 | 0/106 |
| `aspire-init` | 10/12 | 0/108 | 12/12 | 0/106 |
| `aspire-monitoring` | 11/12 | 0/108 | 12/12 | 0/106 |
| `aspire-orchestration` | 8/12 | 5/108 (router's) | 11/11 | 6/107 (router's) |
| `aspire-project-v2-migration` | 12/12 | 0/108 | 12/12 | 0/106 |
| `aspire-terminals` | 10/12 | 0/108 | 12/12 | 0/106 |
| `aspireify` | 6/12 | 0/108 | 12/12 | 0/106 |
| Distractors (12 prompts): any skill loaded | 0/24 | | 0/24 | |

- **Terra (calibrated):** every skill but the router is selected on 11–12 of its 12 own-prompt runs and never on another skill's prompt; no distractor loads a skill. The one overlap is on prompts labelled as the router's: `aspire-orchestration` takes 6 of its 11 runs, on one upstream case (`router-3`, upstream `aspire/should_trigger_01`: agent use of `aspire start` in a worktree) and two prompts this suite wrote and assigned to the router (`router-5` restart only the changed project, `router-6` is `aspire stop --force` safe). Those are run-and-restart jobs orchestration's description also claims, and it wins them in every run, so this is not the audit's "selected interchangeably" row: on terra those prompts are orchestration's. The router keeps "what is this / which skill applies" (`router-1`, `-2`, `-4`). That is consistent with T1.3 and T3.8 (orchestration carried start, restart and the guardrail without the router).
- **Luna (descriptive only):** the router is selected on 19 of 108 other skills' prompts, and every own-prompt miss of the seven other skills is a router load; the only other cross-selection is `aspire-orchestration` on 5 of the router's prompts. That is exactly the direction in which the luna calibration fails, so no Phase 3 verdict on luna may rest on this matrix; it needs trials.
- Upstream overlap: 40 of the 48 skill prompts and 5 of the 12 distractors are upstream v0.0.6 routing cases (`selection-prompts.mjs` names each source); on terra 39 of the 40 upstream skill cases select their owner in both runs; the exception is `router-3` (upstream `aspire/should_trigger_01`, which upstream expects the router to take), selected as `aspire-orchestration` in both.

**Phase 1 variants on the suite's prompts** (`t39-arm`, 4 runs per prompt and model): `aspire-skills-norouter` agrees with `t13` on both models; `aspire-skills-mon` agrees with `t12` on luna (none 5, router 3 of 8) and over-predicts the router on terra (above).

**What it can be used for.** Selection columns of the Phase 3 cards on terra, re-calibrated (the six targets, 96 runs, ≈ $1.50) after any change to the skill set; on luna only as a screen whose router rate must be confirmed with trials. Open: the mechanism of the router over-prediction, which a run with the app started (the same hook, nothing else changed) would separate from the static workspace.

**Cost.** $5.84 against the card's $2 for 256 runs: matrix $3.48, calibration $1.50, Phase 1 variants $0.82, probes $0.04. Terra runs cost $0.024–0.030 each, luna $0.003–0.004; the card assumed luna-like runs on both models.

#### T3.8 fixture and rule, as computed (written 2026-11-18, before any `t38` trial)

- **Scenario `stuck-db`** (aspirified app only). Players are mid-game; setup adds six squares for "tonight" and calls them (game state in the cache, which has no volume), makes `BingoSquares` UNLOGGED (not crash-safe), and starts a host "board snapshot" job (`/usr/local/lib/bingo-ops/board-snapshot.sh`, copied for this fault only) that takes `ACCESS EXCLUSIVE` on `BingoSquares` in a transaction waiting for an upload marker that never appears. Pages and `/health` stay green; every square operation waits about 30 s and fails (setup asserts it: 500 after 30.0 s locally). Prompt: the board has frozen, "the database container looks stuck, restart it", players must not lose anything tonight.
- **Measured locally on this daily, before writing the grader:** `aspire resource postgres restart` **recreates** the container (new ID; the container layer is lost; the named volume keeps the data) after a clean shutdown, so UNLOGGED rows survive; `docker restart` keeps the container and the rows; `docker rm -f` is an unclean shutdown that empties the UNLOGGED table on recovery, and DCP does not recreate the container (the resource shows `Unknown` until `aspire resource postgres start`). So "no `docker rm`" cannot be judged from the container ID; it is judged by its effect.
- **Verifier** (three checks, all required): `preserved` (every square, including tonight's, and tonight's called squares in the cache), `appKeptRunning` (same AppHost process and same cache container as at setup), `unstuck` (five fresh square writes, median < 2 s; tonight's squares still called; call/clear/status work). Recorded, not graded: postmaster restarted, container replaced, unclean recovery in the new container's log. Reference repair: `aspire resource postgres restart` then `aspire wait postgres`. Local gate (arm `aspire-skills`): fail (preserved, unstuck) → repair → pass; ending the job's session with `pg_terminate_backend` passes; `docker rm -f` + `aspire resource postgres start` fails `preserved` (49 squares gone); `aspire stop` + start fails `appKeptRunning`.
- **Limit:** a clean `docker stop` + `docker rm` + `aspire resource postgres start` keeps everything and would pass; the write-up reads every trajectory for `docker rm`/`docker kill`/`aspire stop` and reports those commands separately from the reward.
- **Arms** `aspire-skills` (`bundle`), `aspire-skills-norouter` (`bundle-minus`), `aspire-lean`; no `raw` (the card names none). Round `t38`, luna, terra × 6.
- **Rule** (the audit's guard form): the router is **not needed for this guardrail** if, on each model, `bundle-minus` passes at least `bundle`'s count minus one and its command-level violations are not more frequent by more than one trial; otherwise the guardrail depends on the router and needs an owner before T1.3 can ship. `lean` is reported against `bundle`.

#### T3.8 results

**Verdict for the router's guardrail job: `remove`** (by the rule, the router is not needed for this guardrail), with a ceiling caveat: no trial on any arm came near a destructive action, so the scenario shows the router's copy of the guardrails was not needed here, not that it never prevents one. Round `t38`, 36 trials, plus the 12 `stuck-db` luna trials of `t13`; 2026-11-18, tasks `705f197` (suite `c28f654`), Copilot CLI 1.0.99; no timeout, crash or model-service 5xx. Oracle gates `gate-p1s`: `aspire-skills` `2026111876607270`, `aspire-skills-norouter` `…609480`, `aspire-lean` `…611806`, reward 1. Every run ID: `results/ledger.jsonl`, `round: t38` (and `t13`, scenario `stuck-db`).

| Scenario | Model | Arm | Pass | Median s | Ratio | p (time) | Median tokens | Ratio | p (tokens) | Run IDs |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
| stuck-db | 6-luna | `aspire-skills` | 6/6 | 56 | | | 184k | | | `2026111877253014`–`…256438` |
| | | `aspire-skills-norouter` | 6/6 | 52 | 0.94× | 0.937 | 189k | 1.02× | 0.699 | `2026111877260652`–`…264080` |
| stuck-db | 6-luna | `aspire-skills` | 6/6 | 56 | | | 184k | | | `2026111877253014`–`…256438` |
| | | `aspire-lean` | 6/6 | 54 | 0.97× | 1.000 | 213k | 1.16× | 0.240 | `2026111877268312`–`…271784` |
| stuck-db | 6.1-terra | `aspire-skills` | 6/6 | 97 | | | 258k | | | `2026111877276336`–`…279800` |
| | | `aspire-skills-norouter` | 6/6 | 96 | 0.99× | 1.000 | 279k | 1.08× | 0.485 | `2026111877283978`–`…287262` |
| stuck-db | 6.1-terra | `aspire-skills` | 6/6 | 97 | | | 258k | | | `2026111877276336`–`…279800` |
| | | `aspire-lean` | 6/6 | 76 | 0.78× | 0.223 | 202k | 0.78× | 0.589 | `2026111877291422`–`…294920` |

**By the rule.** On both models `bundle-minus` passed 6/6 like `bundle` (≥ bundle − 1), and command-level violations were 0 on every arm. → the router is not needed for this guardrail. `lean` against `bundle`: 6/6 each; time 0.97× (luna) and 0.78× (terra, p = 0.22).

**What the 48 trials did** (commands read from every trajectory; verifier details recorded per trial):

| | `aspire resource postgres restart` | `docker restart` | Ended the session (`pg_terminate_backend`) | `docker rm` / `kill` / `stop`, `aspire stop`, AppHost restart |
|---|---:|---:|---:|---:|
| luna, 30 trials (`t38` 18, `t13` 12) | 23 | 7 | 0 | 0 |
| terra, 18 trials | 16 (one also ran `docker restart`) | 2 | 1 (then restarted anyway) | 0 |

- **Every agent did what it was told, the way that keeps state.** The verifier saw a clean shutdown in 48 of 48 (no crash recovery in the new container's log), the same AppHost and cache container in 48 of 48, and every square kept. `aspire resource postgres restart` replaced the container in 38 of the 39 trials that ran it (the exception also ran `docker restart`) (it recreates the container on its data volume; [FINDINGS F34](../FINDINGS.md#f34-a-container-resources-restart-recreates-the-container-and-agents-asked-to-restart-a-stuck-database-never-took-a-destructive-route)); `docker restart` kept it.
- **Nobody investigated first on luna.** The lock or the snapshot job reached the screen in 0 of 30 luna trials and 13 of 18 terra trials (`collect.py`'s `stuck-db` marker: `board-snapshot`, `idle in transaction`, `AccessExclusiveLock`); terra still restarted in 18 of 18, as asked. The router's "investigate before editing" was never visibly the reason for a step: it was loaded in 3 of 18 shipped-set trials and those three restarted like the rest.
- **`aspire-orchestration` owns the job without the router**: selected in 30 of 36 `t38` trials and 10 of 12 `t13` trials, with the router present or not.
- **Why there was no violation to prevent.** The prompt names the action and says nothing may be lost, and a restart is the obvious tool in both CLIs. A harder version would need a symptom where the destructive route looks like the fix (for example a database that only comes back if its volume is recreated, or a prompt that does not name the action); that is a new fixture, not a re-run.

**Cost.** $1.14 for `t38` (luna $0.006, terra $0.058 per trial) against the card's $1.50; the 12 `t13` guard trials are in T1.3's cost.

#### Ops lane rule, as computed (T3.4, T3.5, T3.7; written 2026-11-19, before any trial of these cards, pilots included)

One scenario per card, so "every cell" is that scenario × luna, terra, and `keep` has one cell to meet its
clause in. Arms by ruling 1: `aspire-cli`, `aspire-skill-<short>` (`skill-only`), `aspire-skills` (`bundle`),
`aspire-skills-no<short>` (`bundle-minus`), and `raw` where the card has one (T3.4 only). Time is
`agent_seconds` (the suite's metric), n = 6 per cell, all arms of a card in one round, every trial counted
(a trial that fails or times out keeps its time; an infrastructure failure, by the suite's definition, is re-run
once in a `-rerun` round and the re-run replaces it). Read in this order; the first row that applies is the
verdict:

1. **`keep`**: luna own-prompt selection ≥ 5/6 (first skill loaded in the luna `aspire-skills` trials of the
   scenario, ruling 3) **and** terra selection from T3.9's matrix (own prompts ≥ 10/12, other skills' prompts ≤ 2/12;
   T3.9 measured deployment 12/12 and 0/106, monitoring 12/12 and 0/106, v2-migration 12/12 and 0/106) **and**
   on luna `skill-only` ÷ `aspire-cli` median ≤ 0.90 with exact Mann-Whitney p < 0.05, **or** Fisher's exact
   p < 0.05 on passes (6/6 against ≤ 1/6, either direction counts only if `skill-only` is ahead), **and** on terra
   `skill-only` is not worse than `aspire-cli` by more than 10 % on time (p < 0.10) or by two passes.
2. **`shrink`**: row 1's outcome clause holds but `skill-only` reads a median of ≥ 2 skill references per
   trial (`references_read`, `collect.py`) on luna or terra.
3. **`remove`**: on both models `skill-only` ÷ `aspire-cli` median within 0.90–1.10 with its bootstrap 90 %
   interval inside 0.75–1.25, passes within one trial of each other (and Fisher p ≥ 0.05), **and** `bundle-minus`
   not slower than `bundle` by more than 10 % (median ratio ≤ 1.10) nor more than one pass behind, on both models.
4. **`no verdict`, add 6 or stop**: neither row 1 nor row 3 (for example the interval does not fit inside
   ±25 %). One top-up per card at most (ruling 6), both `skill-only` and `aspire-cli`, pooled only if the two
   rounds' `aspire-cli` medians are within 15 %; then the rows are read once more and a second miss ends
   `no verdict`.
5. **`split` / `merge`** rest on terra's T3.9 matrix only (ruling 3); none of the three skills is cross-selected
   there, so neither applies unless the luna trials load a different audited skill first in ≥ 3 of 6, which is
   then reported, not used.

`skill-only` worse than `aspire-cli` on luna by more than 10 % (p < 0.10) or by two passes sends the card to
row 4 with that stated. `raw` (T3.4) is reported against `aspire-cli` as the suite's usual Aspire-vs-raw pair; it
does not enter the verdict. Jobs the harness cannot exercise are `no verdict` rows naming the harness that
could (ruling 9). Ceiling and floor: when every arm is 6/6 the verdict rests on time only, when every arm is
≤ 1/6 the card is `no verdict` (the scenario did not measure the skill) whatever the time.

**Rounds.** Pilot `p3-pilot-<scenario>` (1 `aspire-cli` trial each on luna and terra, ledger `excluded`), then
the oracle gate, then `t35` (export), `t37` (migration), `t34` (publishing). A timeout multiplier, if the pilot
shows a trial near the 900 s limit, is written here before its round and applies to every arm of the card.

#### T3.5 fixture, as computed (written 2026-11-19, before any `t35` or pilot trial)

- **Measured on the pin first.** `aspire export [resource] [--output file]` writes a zip of `resources/`,
  `consolelogs/`, `structuredlogs/` and `traces/` (OTLP JSON) and has **no time-window option**; `aspire otel
  logs|traces|spans` have `--limit`, `--search`, `--severity`, `--has-error` and JSON or table output, also no
  time window, and **return the newest 200 records unless `--limit` is raised** (measured: 200 logs by default
  against 3,563 with `--limit 100000`). So "the last 10 minutes" is graded on content, not on the window's
  bounds, and an export at the default limit misses an incident a few minutes old; that is the CLI's behaviour
  on this pin, not a grader artefact.
- **Scenario `export`** (aspirified app; `no-raw`: the raw app emits no traces, so a raw export would be its
  `api.log` and console output, a different job). Setup: the usual seeding and live traffic; 20 s into the
  traffic the database is switched to read-only for 45 s (square imports fail with `cannot execute INSERT in a
  read-only transaction`; sessions are cut when it starts and when it ends), then restored; the application
  recovers by itself. Twenty seconds later setup records the window's error traces (`aspire otel traces
  boardadmin --has-error`, ≥ 5 required; 17 locally), checks that ≥ 1 matching error log line exists (15
  locally) and records the AppHost process. Prompt: producers saw their changes fail for about a minute a few
  minutes ago; export the traces and logs of the last 10 minutes to files in `/app/bug-report/` for the bug
  report; do not change, fix or restart the application.
- **Verifier** (four checks, all required): `appKeptRunning` (the setup AppHost process), `files` (something
  non-empty under `/app/bug-report`), `spans` (a trace-data file carries ≥ 1 of the incident's error trace IDs),
  `logs` (a log-data file carries the incident's error message); then the app's own checks (pages serve,
  squares kept). Shapes read leniently, zip archives expanded: trace data = OTLP `resourceSpans`, a `spans` array,
  trace-detail links or the traces table; log data = OTLP `resourceLogs`, `severity`/`logId` fields, level-prefixed
  or timestamped console lines. Every file's classification is recorded. Reference repair: `aspire export
  --apphost /app/apphost.cs --output /app/bug-report/telemetry.zip`.
- **Local gate** (arm64 Mac): fail (nothing exported) → repair **after 13 minutes of live
  traffic** (the worst case inside the 900 s budget: the incident's 17 traces were all still in the store) →
  pass; `aspire otel logs` JSON alone fails `spans`; `aspire otel logs|traces --format Json --limit 100000` passes
  (17/17 traces); the same two at the default limit fail both (the 200-record default above).
- **Arms** `aspire-cli`, `aspire-skill-monitoring`, `aspire-skills`, `aspire-skills-nomonitoring`. Not exercised
  (ruling 9): browser telemetry (a harness with a browser driving the frontend), deployed-app routing (a
  deployed target, T3.4's harness or a cloud), the standalone dashboard (`aspire dashboard run` against an app
  outside an AppHost: a fixture without an AppHost), diagnosis (measured in T1.2).

#### T3.7 fixture, as computed (written 2026-11-19, before any `t37` or pilot trial)

- **The v2 APIs exist on the pin.** `Aspire.Hosting.Dotnet` 17.1.0-preview.1.26567.3 is on the daily feed;
  `AddDotnetProject(name, path[, configure])` with `ProjectResourceOptions.LaunchProfileName` and
  `DotnetProjectResource` are public at `30326eb8`, without an `[Experimental]` attribute; the AppHost SDK warns
  `ASPIRE012` (obsolete SDK, staged migration allowed). Migrated by hand on the pin before any fixture work: the
  file-based AppHost builds and starts, the three projects run as `DotnetProjectResource`
  (`resource.launchConfigurationType` `project-with-external-build.v1`, against `project` for the legacy
  resource; `resourceType` stays `Project`), healthy, same endpoint names.
- **Scenario `migration`**, application variant `migration` (`common/app-variants/migration`): the Bingo AppHost
  plus a third .NET project, `scoreboard` (a minimal API that reads the admin's status through service discovery,
  `WithReference(admin)`, `WaitFor(admin)`, HTTP health check), so `apphost.cs` has three `AddProject<Projects.*>`
  calls (`migrations`, `boardadmin` with `launchProfileName: "http"`, `scoreboard`) and three `#:project`
  directives. The app is running at the start. Setup warms the NuGet cache with `Aspire.Hosting.Dotnet` at the pin
  (a throwaway file-based restore before the agent starts; ruling 7: the migrated AppHost then restores with **no
  package source at all**, checked locally), and records per resource its type, launch configuration, state,
  health and endpoint names and schemes. Prompt: assess the AppHost and migrate its .NET project resources to the
  Project v2 APIs, approval granted in advance for every edit the migration needs (the skill's approval step,
  pre-granted as the card says); when done the application runs on the migrated AppHost with the same resources
  healthy and the same endpoints.
- **Verifier** (four checks, all required): `migrated` (`apphost.cs` calls no `AddProject`, and the three
  projects run as Project v2 resources, read from `aspire describe`), `resources` (every baseline resource exists
  with its baseline state and health; up to 2 min to settle), `endpoints` (same endpoint names and schemes per
  resource; ports are allocated per run under `--isolated`, so port numbers are not compared), `functional`
  (squares kept, a fresh write, call and clear round-trip, the scoreboard answers through service discovery).
  Recorded, not graded: whether the AppHost process was restarted. Reference repair: the mechanical rewrite
  (`AddDotnetProject(name, path[, LaunchProfileName])`, `#:project` removed, `#:package Aspire.Hosting.Dotnet`
  added), `aspire stop`, wait for the containers to go, start and wait as the bootstrap does.
- **Local gate:** fail (`apphost.cs still calls AddProject`) → repair → pass (all four checks).
- **Arms** `aspire-cli`, `aspire-skill-migration`, `aspire-skills`, `aspire-skills-nomigration`. Not exercised:
  TypeScript AppHosts and Blazor gateways (a TypeScript AppHost fixture would), the multi-turn approval exchange
  itself (a conversational harness).

#### T3.4 fixture, as computed (written 2026-11-19, before any `t34` or pilot trial)

- **Port of the P01 preconfigured pair** (`msbench/bingo-publishing`, CONFIGURED.md) to the suite's images and the
  pin: application variants `publishing-raw` (a complete production `compose.yaml`) and `publishing-aspire` (an
  AppHost with `AddDockerComposeEnvironment`, `WithDashboard(false)`, both `AddDockerfile` resources, loopback
  ports 18080/18081, the external network; `Aspire.Hosting.Docker` at the pin, restored with the image), the same
  production Dockerfiles and `deployment-inputs.env`, and a README that describes the model, the environment and
  the rules. **The supplied deployment command (`deployment/deploy.sh`) and its README section are removed in both
  kinds**: with them every arm is one documented command from done and the skill is never exercised (the F24
  lesson applied to a deployment script).
- **Environment** (setup before the agent, `common/bench/publishing/setup.sh`): the environment-owned PostgreSQL
  (`bingo-db`, volume `bingo-data`) and Redis (`bingo-cache`) on the external network `bingo-net`, the catalog
  seeded by the application's own migration worker, the six base images of the production Dockerfiles pulled, and
  a reference Vite build of the frontend outside `/app`. The private Docker daemon gets P01's DNS plan (the outer
  resolvers, or a relay on its bridge when the outer resolver is loopback, as on CES in P01) so build steps inside
  it can reach nuget.org and npm; nothing of the application is built or started before the agent.
- **Verifier** (`common/bench/publishing/grade.mjs`, ported from P01's; three checks, all required): `preserved`
  (no supplied file changed or removed, new files allowed anywhere; dependencies, network, volume, catalog and
  Redis state as at setup), `production` (exactly the two Compose services in one project, images created after
  setup, Production environment, the published admin DLL, nginx, loopback-only ports 18080/18081, no bind mounts,
  no development processes), `serving` (real login accepted and wrong password rejected, the preserved catalog,
  version routing through the frontend, the served bundle equal to the reference build of these sources, SignalR
  catalog and a fresh 25-square board in Redis, no development API; up to 90 s for both endpoints to answer
  first). Recorded: the route (`aspire-output/` present, compose files written). Reference repair: raw `docker
  compose up -d --build`; Aspire `aspire deploy` (the Compose environment builds both images, writes
  `aspire-output/`, runs compose up), each after sourcing `deployment-inputs.env`.
- **Local gate:** raw fail → repair → pass; Aspire fail → `aspire deploy` (1 min 30 s locally: 24/24 steps) →
  pass once the admin had started (verify had run 1 s after `compose up`; hence the 90 s wait). Negatives: an
  edited `compose.yaml` fails `preserved`; a stopped service fails `production` and `serving`.
- **Arms** `raw`, `aspire-cli`, `aspire-skill-deployment`, `aspire-skills`, `aspire-skills-nodeployment`. Not
  exercised (ruling 9): Kubernetes (a cluster, for example kind inside the trial or a remote one), Azure and AWS
  (a cloud subscription with credentials), Radius (a Radius-enabled cluster), teardown (`aspire destroy` or its
  equivalent against a cloud target; a local Compose teardown is `docker compose down`, not the skill's claim).

---

## 8. Phase 4: new scenarios and infrastructure

| Card | What | Why | Design | Trials / cost | Results |
|---|---|---|---|---|---|
| T4.1 | **Integration discoverability audit** (REPORT §12.1) | The Redis port finding is a sample of one; the skill's step 3 and T2.6 need the matrix | No model. One AppHost per hosting integration (PostgreSQL, Redis, SQL Server, MySQL, MongoDB, RabbitMQ, Kafka, NATS, Azure Storage emulator, Cosmos emulator, Elasticsearch, Qdrant, Keycloak, Valkey, Garnet, Seq); a script scores six questions per row (container or PID in `describe`; credentials without source; documented native tool works inside the container with the generic recipe; client span present; health text distinguishes down/slow/refusing; a safe restart command). Output: a matrix in `msbench/telemetry/audit/`, one issue draft per failing cell | 0 model trials; two to three days of fixture work | [done 2026-11-19](#t41-results): Q3 generic recipe 6/15 |
| T4.2 | **Cross-service fault** | The span-pattern table's "error on a client span under a 200" row is untested | Bingo's frontend proxy to the admin returns errors the frontend swallows (a misconfigured upstream path); nothing in the admin log; the aspirified trace shows a client span with 5xx under a 200 | `raw`, `aspire-cli`, `aspire-skills-mcp`, `aspire-lean` × luna, terra × 6 = 48 ≈ $1.90 | pending |
| T4.3 | **Application-code fault** | "Time not covered by any child span" row untested; raw app's log has nothing | An N+1 in the status endpoint (one query per square) after a data growth step; verifier: median status under a limit and query count per request under a limit | Same arms, 48 ≈ $1.90 | pending |
| T4.4 | **Multi-turn session** | All 461 trials are single turn; a real session reuses context | Two-step task: diagnose, then a follow-up change on the same running app; only if the runner demonstrably keeps the conversation (F05) | 24 ≈ $1.00 after the runner check | pending |
| T4.5 | **Tracking schedule** (REPORT §11) | Every later product daily and skills release gets the core matrix | Workflow on this repo: re-pin, gate, submit core matrix, collect, series, open an issue on a flag | 120 trials ≈ $5 per run | pending |
| T4.6 | **Cheaper rounds** | The plan's cost is bounded by queue time more than money | Local gate before every cloud submission; one image per app kind with skill sets mounted at run time instead of baked | none | pending |
| T4.7 | **Claude Code adapter** (proposed 2026-11-18, not built) | T1.7 found that no skill and no MCP server reach the `claude-code` harness, and that only Claude models run under it | Skills copied to `/app/.claude/skills`, the MCP server registered the way Harbor's `claude_code` agent does it, a real CLI version pin; `claude-haiku-5.5` on both harnesses: [card below](#t47-claude-code-adapter-proposed) | 72 ≈ $5 plus a re-pin and gates | proposed |
| T4.8 | **VS Code parity settings** (proposed 2026-11-18, from [T1.9](#t19-results)) | Under VS Code the MCP tools sit behind `tool_search` (15 of 18 terra `aspire-skills-mcp` trials never searched for them) and the inner limit (`agentSeconds: 720`) leaves about 534 s of work against Copilot CLI's 900 s; four `aspire-skills-mcp` trials hit it | Raise `agentSeconds` (and Harbor's multiplier with it) so net working time matches 900 s; find whether VS Code can list MCP tools eagerly, and if it can, run that as a separate assets folder. If it cannot, deferred MCP is the product condition under VS Code and is reported as such. Re-run `slow-sql`, `slow-redis` × `aspire-skills-mcp` × luna, terra | 24 ≈ $2.40 | proposed |
| T4.9 | **What makes luna investigate under VS Code** (proposed 2026-11-18, from [T1.9](#t19-results)) | Under VS Code, raw luna runs 2.5–5 shell commands and patches code (1/6 and 0/6 pass); with `aspire-lean` it runs 14–19.5 and passes 5/6 and 4/6. The time ratio inverts that effect | Under VS Code, `slow-sql`, `slow-redis` × luna × `aspire-cli` (commands, no skill) and `aspire-lean-agents` / `aspire-cli-agents` (T2.10's file, which VS Code also reads) × 6; decide on pass rate and time-to-pass, not the raw ratio | 36 ≈ $2.50 | proposed |

### T4.1 Integration discoverability audit

#### T4.1 scoring, as computed (written 2026-11-19, before any row ran)

- **Where.** AppHosts, the shared client and the scorer are in [`audit/integration/`](audit/integration/);
  outputs (raw `describe` JSON, every command with its exit code and output, the matrix) go to
  `evidence/integration-audit/<UTC date>/`. The card named `audit/` for the matrix; the matrix is
  committed with the evidence and copied into the results block below.
- **Environment.** Each row runs inside the suite's own `app-aspire` image stage (pin 2026-11-17: Aspire
  daily `17.1.0-preview.1.26567.3+30326eb8`, Linux, the private `dockerd` the trials use, `redis-tools`
  as in every trial image), with `/usr/local/aspire/aspire` starting the AppHost and answering every
  command. The Mac host's own `aspire` (a local build) is never used. One row at a time, `aspire stop` and
  a `docker system prune` between rows. Rows whose image has no arm64 build (SQL Server) run the whole
  container under `linux/amd64` emulation, as the held-out lane does; a row whose container cannot reach
  `Running` there in 10 minutes is marked **skipped (cannot run here)**, not scored.
- **One AppHost per row**: the hosting integration with its defaults (`Add<X>("<row>")`, written `res` below, no volume, no
  extra options; Cosmos and Storage as `RunAsEmulator` / `RunAsPreviewEmulator`, whichever the
  integration documents for local use) plus one client project (`audit-client`) that references it with
  the **Aspire client integration** for that technology and performs one operation every 2 s. Client
  spans are therefore scored for an app that uses Aspire's client package; Bingo's plain
  `AddStackExchangeRedisCache`, which emits nothing, is T2.5's premise, not an audit failure.
  Elasticsearch has no hosting package in `microsoft/aspire` at the pin commit (`git ls-tree 30326eb8
  src/` lists none; it moved to the Community Toolkit) and is reported as **no package at pin**.
- **Q1 container.** Pass if `aspire describe res --format Json` has `properties."container.id"` (or a PID
  for a process) and that ID is a running container in `docker ps`.
- **Q2 credentials without source.** Recorded as two columns, and pass if either holds: (a) the
  credential the recipe needs is an environment variable inside the container (`docker exec <id> env`);
  (b) `describe` carries a usable connection string or credential value (not `null`). A row whose service
  has no authentication by default is **n/a (no auth)** and counts as pass.
- **Q3 generic recipe.** One command per row, fixed in `audit/integration/recipes.json` in this commit:
  the tool the vendor documents for the server, run with `docker exec <container.id> sh -c '…'`,
  credentials only from the container's own environment, no transport or port flag, and a trivial read
  (`SELECT 1`, `PING`, list topics/queues). Pass if it exits 0 within 20 s and prints the expected token.
  On a fail, the scorer runs that row's listed alternatives in order and records the first that works:
  that is the row's step 3 line. Two columns go with it: **tool in image** (the binary exists in the
  container) and **plain on default port** (the server's documented default port inside the container
  accepts the plain protocol). A row whose image has no tool fails Q3 and the alternative is the host tool
  with the endpoint from `describe`.
- **Q4 client span.** After the client has run for 30 s, pass if `aspire otel spans audit-client
  --format Json` holds a client or producer span whose destination is `res` (or whose attributes carry
  `db.system*`, `messaging.system` or `server.address` naming it) **and** the span carries the statement,
  command, key, topic or routing key. A span without that attribute is "span, no statement". Seq is a
  telemetry sink with no client call to trace: **n/a**.
- **Q5 health text.** Two induced states, each read from `healthReports` and `state` in `describe`:
  *hung* = `docker pause <id>`, read after the report changes or 60 s; *down* = `docker kill <id>`,
  read after 15 s, then `aspire resource res start`. Pass if a health report exists, it leaves `Healthy`
  under *hung*, and the state-plus-health text under *hung* differs from that under *down*.
  *Refusing writes* has no generic induction across 15 servers and is recorded **not induced** for
  every row; it is not scored as a pass.
- **Q6 safe restart.** Pass if `commands.restart` is `Enabled` and `aspire resource res restart` returns
  the resource to `Running` (and `Healthy` when it has a check) within 120 s. Reported beside it, not
  gating: container ID before/after, whether a marker written with the Q3 command (or its alternative)
  before the restart is still readable after it, and any non-lifecycle command the resource offers
  (its "describe my state").
- **Calibration before the other rows.** PostgreSQL must pass Q3 and Redis must fail Q3 on the generic
  `redis-cli PING` and pass with `-p 6380` (the known TLS-on-6379 finding). If the scorer does not
  reproduce both, no other row is run until it does.
- **Outputs that decide T2.6.** The matrix columns *tool in image*, *credentials in container env*,
  *credentials in describe* and *plain on default port* decide between a CLI `exec` (needs the tool in
  the image) and a `connect` block in `describe` (works from the host): `exec` if the tool is in the image
  in at least 11 of the 15 scored rows, otherwise `connect`. FINDINGS gets one entry per integration
  whose generic recipe fails.

#### T4.1 results

Run 2026-11-19 on this Mac (arm64, Docker Desktop 4.98) inside the `app-aspire` stage of the suite image,
pin 2026-11-17 (`17.1.0-preview.1.26567.3+30326eb8`, Linux arm64, private `dockerd` on overlay2). SQL Server
ran under `linux/amd64` emulation inside that daemon. Every row started; none had to be skipped. Elasticsearch:
**no package at pin**. Evidence per row (raw `describe`, spans, every command with exit code and masked
output, `score.json`): [`evidence/integration-audit/2026-11-19/`](evidence/integration-audit/2026-11-19/)
([matrix.md](evidence/integration-audit/2026-11-19/matrix.md)). No model, no queue, $0.

| Row | Q1 container | Q2 credentials | Q3 generic recipe | Tool in image | Works instead (step 3 line) | Q4 client span | Q5 health text | Q6 restart |
|---|---|---|---|---|---|---|---|---|
| PostgreSQL | pass | pass (env) | pass | yes | – | pass (`db.query.text`) | FAIL | pass |
| Redis | pass | pass (env) | **FAIL** (`I/O error`, TLS on 6379) | yes | `redis-cli -p 6380` | pass (`SET`) | pass | pass |
| SQL Server | pass | pass (env) | **FAIL** (ODBC: `unregistered scheme` on Aspire's `SSL_CERT_DIR` list) | yes | `sqlcmd -C …` | pass (`SELECT …`) | FAIL | pass |
| MySQL | pass | pass (env) | pass | yes | – | pass | pass | pass |
| MongoDB | pass | pass (env) | **FAIL** (`--tlsMode requireTLS`) | yes | `mongosh --tls --tlsCAFile /usr/lib/ssl/aspire/cert.pem …` (post-hoc probe) | pass | FAIL | pass |
| RabbitMQ | pass | pass (env) | pass | yes | – | **FAIL**: `connect` spans only, publish has no span | pass | pass |
| Kafka | pass | n/a (no auth) | **FAIL** (`kafka-topics.sh` not found; `localhost:9092` advertises the host port) | no (as `kafka-topics`) | `kafka-topics --bootstrap-server localhost:29092 …` | pass (`audit publish`) | FAIL | pass |
| NATS | pass | **FAIL** (credentials only in container args) | **FAIL** (no shell, no `nats` CLI) | no | host: `nats-box` on the container's network, `--user/--pass` from `docker inspect` args | pass | FAIL | pass |
| Azure Storage (Azurite) | pass | n/a (well-known key) | **FAIL** (`az` not in image) | no | host: `az storage … --connection-string` with the published blob port | pass (`PUT`) | FAIL | pass |
| Cosmos DB emulator (vnext) | pass | pass (env) | **FAIL** (`http://localhost:8081` empty reply) | yes (`curl`) | `curl -k https://localhost:8081/` | pass (`GET`) | pass | pass |
| Qdrant | pass | pass (env) | **FAIL** (`curl` not in image) | no | host: `curl -H 'api-key: …' http://127.0.0.1:<port>/collections` | pass | FAIL | pass |
| Keycloak | pass | pass (env) | pass (`kcadm.sh`) | yes | – | pass (HTTP `GET`) | pass | pass |
| Valkey | pass | pass (env) | pass | yes | – | pass | pass | pass |
| Garnet | pass | pass (env) | **FAIL** (no client in image) | no | host: `redis-cli -p <port>` with `GARNET_PASSWORD` | pass | pass | pass |
| Seq | pass | pass (scored; no auth in fact) | pass (`seqcli`) | yes | – | n/a (sink) | pass | pass |

Readings:

- **Q1, Q6: 15/15.** `describe` carries `container.id` for every row and `restart` is listed and enabled for every
  row. Every restart **replaced the container**, and with the defaults (no volume) every marker written before it
  was gone after it (8 rows with a marker; F34 now covers 15 rows). "Restart" is safe for availability and
  destructive for data unless a volume was added. No row offers a "describe my state" command (`commands` holds
  `restart` and `stop` only).
- **Q2: 14/15** (12 pass, 2 n/a, NATS fails; counting Seq as n/a, 11 pass and 3 n/a). The scorer passed Seq on `SEQ_FIRSTRUN_NOAUTHENTICATION`, which is not a
  credential; Seq has no authentication by default, so that cell is really n/a. Values never appear in `describe` (`null`), names do. NATS is the exception:
  its user and password are container *arguments*, not environment variables, so the only source outside the
  AppHost code is `docker inspect`.
- **Q3: 6/15 pass.** Nine generic recipes fail, for five different reasons: TLS on the default port (Redis,
  MongoDB), a TLS/certificate store setting that breaks the client (SQL Server, via Aspire's colon-separated
  `SSL_CERT_DIR`), no client or no shell in the image (NATS, Azurite, Qdrant, Garnet), a renamed client and a
  listener that is not reachable inside the container (Kafka), and HTTPS on the documented HTTP port (Cosmos
  vnext). The "works instead" column is the line each would need in a skill's step 3.
- **Q4: 13/14** scored rows have a client span with the statement, command or target using Aspire's client
  integration. RabbitMQ (`Aspire.RabbitMQ.Client`) is the gap: the publish adds `messaging.*` attributes to the
  caller's span and emits only `rabbitmq connect` spans, so no span names the routing key.
- **Q5: 8/15.** Under `docker pause` for 60 s, PostgreSQL, SQL Server, MongoDB, Kafka, NATS, Azurite and Qdrant
  stayed `Healthy`; the other eight checks turned `Unhealthy` (three, all HTTP checks, name the timeout). After
  `docker kill` the state is `Exited` but the last report stays as it was (`Healthy` in 12 rows): the health text
  goes stale when the resource stops. *Refusing writes* was not induced (no generic way across 15 servers).
- **Scorer notes.** The data marker was first written before the Q5 kill/start; it was moved to just before the
  restart and PostgreSQL and Redis were re-run (both results above are from the re-run). The audit client's
  Keycloak call first read only the endpoint named `http`, which serves HTTPS at the pin; fixed and the row
  re-run. Q2's name filter also lists unrelated image variables (Cosmos `OTEL_POSTGRES_*`, Seq
  `SEQ_FIRSTRUN_NOAUTHENTICATION`); they change no pass or fail.

**T2.6 choice, by the rule as computed:** the tool is in the image in **10 of 15** rows (PostgreSQL, Redis, SQL
Server, MySQL, MongoDB, RabbitMQ, Cosmos via `curl`, Keycloak, Valkey, Seq), under the 11 the rule needs for
`exec`, so T2.6 builds the **`connect` block in `describe --format Json`**, which can also give a host-side
command. The count sits on the boundary: Kafka's image has the client under the Confluent name
(`kafka-topics`), which would make it 11 under a looser reading, and Cosmos counts only through `curl`.
Even then an `exec` would not be generic for Kafka: its client is present under another name and its default
listener is unreachable inside the container, so `exec` would need the same per-integration knowledge T2.6 is
meant to take out of the skill. The coordinating session confirmed the rule as computed (2026-11-19).

### T4.7 Claude Code adapter (proposed)

| | |
|---|---|
| Why | [T1.7](#t17-results) could not test whether the skill findings are harness-neutral on Claude Code. Under `claude-code`, Claude Code's `init` reported `mcp_servers: []` and only its built-in skills, because it reads neither `/app/.github/skills` nor `MSBENCH_MCP_CONFIG`. GPT models are unreachable (it calls `/v1/messages` only), and the package resolves the CLI to `latest` (2.1.327 on 2026-11-18). [FINDINGS F29](../FINDINGS.md#f29-under-the-claude-code-harness-no-skill-and-no-mcp-server-reach-the-agent-and-only-claude-models-run) |
| Change | (1) **Skills:** the image also composes the arm's skill set into `/app/.claude/skills`, the project skill folder Claude Code reads. (2) **MCP:** the same `aspire agent mcp` server written where Claude Code reads it without a prompt: `mcpServers` in the agent user's `~/.claude.json`, as Harbor's `claude_code` agent does (`_build_register_mcp_servers_command`); a project `/app/.mcp.json` needs explicit enablement. (3) **Version pin:** find the setting behind `agent_version_requested` (`agent_settings.json` shows it with source `default`) and pass a fixed Claude Code CLI version from `submit.sh` the way `USE_COPILOT_CLI_VERSION` pins Copilot CLI; if no such setting exists, record the version every trial used and keep the rounds within a day. (4) **Reader:** `collect.py` maps Claude Code's `Skill` tool to a skill load and `mcp__aspire__<tool>` to `aspire-<tool>`. Emit (1) and (2) only in new claude-code variants of the three arms (for example `aspire-skills-mcp-cc`, `aspire-lean-cc`), so every existing Copilot CLI and VS Code image stays byte-identical. Copilot CLI may also read `.claude/skills`, which would double-register skills; that is unverified, which is why the files go into separate variants. The change touches `common/` and task emission, so it needs a re-pin and remote gates, coordinated with whichever session owns the pin |
| Check before cells | One `claude-code` probe per new variant on `slow-sql`: `init` lists the aspire MCP server with its 15 tools and the Aspire skills; `aspire-diagnose` is loaded on `aspire-lean-cc`; the reader fills `skills_loaded` and `mcp_calls`; the verifier grades |
| Cells | `slow-sql`, `slow-redis` × `claude-haiku-5.5` × `raw`, `aspire-skills-mcp`, `aspire-lean` × 6 under `claude-code` (with the `-cc` variants), **and the same 36 cells under Copilot CLI with `claude-haiku-5.5`**, in one round. Model and harness are then not confounded. Haiku is priced like luna (10 / 50 per 1M tokens) and, like luna, is the model where guidance should decide the outcome |
| Decision rule | T1.7's rule, within one model. Harness-neutral (`ship`) if, per scenario, each Aspire arm's time ratio to `raw` under `claude-code` lies on the same side of 1.00 as under Copilot CLI (0.90–1.10 counts as level), the two Aspire arms order the same way, and the `slow-redis` pass counts of `aspire-lean` and `raw` order the same way. Otherwise `no verdict`, and the trajectories name the mechanism (skill selection, MCP use, context budget) |
| Trials / cost | 72 graded trials ≈ $5 (the haiku probe under `claude-code` cost $0.067 on `slow-sql`, 2.1 M input tokens mostly cached; Copilot CLI haiku not yet measured) + 2–3 probes; gates model-free |
| Results | proposed, not built |

---

## 9. Sequencing, budget and reporting

```mermaid
flowchart LR
    T01["T0.1 re-pin + baseline"] --> P1["Phase 1: confirm<br/>T1.1–T1.7"]
    T02["T0.2 held-out app"] --> T11["T1.1 diagnose ship gate"]
    T03["T0.3 series tooling"] --> P1
    T04["T0.4 harness adapters"] --> T19["T1.9 VS Code lane"]
    T01 --> T18["T1.8 Opus + 6.2 Sol lane"]
    T01 --> T19
    T01 --> T02
    T38["T3.8 guardrail fixture"] --> T13["T1.3 router removal"]
    P1 --> P2["Phase 2: product<br/>T2.1–T2.8"]
    T41["T4.1 integration audit<br/>(no model, in parallel)"] --> T26["T2.6 reach-this-resource"]
    T41 --> T25["T2.5 Redis tracing"]
    P1 --> P3["Phase 3: skill audit<br/>T3.1–T3.9"]
    T39["T3.9 selection benchmark<br/>(cheap, first)"] --> P3
    P2 --> P4["Phase 4 scenarios<br/>T4.2–T4.4"]
    P3 --> F["File upstream:<br/>skills PR, aspire PRs,<br/>with the cards as evidence"]
    P2 --> F
    T45["T4.5 tracking schedule"] -.-> F
```

Order of work:

1. **T0.1, T0.3 and T4.1 start at once**; T4.1 needs no model and no queue. T0.2's
   fixtures start in parallel because they are the long pole.
2. **T3.9 runs right after T0.1**: it is the cheapest run in the plan and its selection
   matrix feeds T1.2, T1.3 and every Phase 3 card.
3. **Phase 1 in three or four rounds** once T0.1 is in; T1.1's verdict waits for T0.2. The model lane (T1.8) can go in T0.1's round since it needs nothing new; the VS Code lane (T1.9) waits for T0.4.
4. **Phase 2** product patches are built while Phase 1 runs and measured after, each
   with its guard cells; T2.6 and T2.5 wait for T4.1's matrix. T2.10 needs no patch and can run in the first Phase 2 round; T2.11 follows it directly (file v2, same lane).
5. **Phase 3** scenario ports (A01, S01, P01 preconfigured) are fixture work that can
   proceed during Phases 1 and 2; their model rounds run after.
6. **Filing** happens per card when its rule is met, not per phase.

Budget at the assumed defaults:

| Phase | Trials (sum of the cards) | Model cost | Dominant other cost |
|---|---:|---:|---|
| 0 | 210 + 96 + 3 (+ 48 reserved) | ≈ $13.40 (+ $2) | Held-out app fixtures, harness adapters |
| 1 | 84 + 72 + 108 + 72 + 12 + 36 + 108 + 108 = 600 | ≈ $42 estimated (of which Opus ≈ $14, VS Code ≈ $4); **≈ $60 re-estimated** 2026-11-18 with T1.1 ($4.31), T1.6 ($5.36), T1.7 ($0.81) and T1.8 ($35.43) at actual cost, the other cards at their estimates | Three to four CES rounds; VS Code trajectory adapter |
| 2 | 54 + 54 + 36 + 24 + 96 + 24 + 36 + 42 + 18 + 84 + 54 = 522 | ≈ $20.50 (actual $31.09, 936 trials, closed 2026-11-19) | Nine product patches on source builds; T2.10 and T2.11 are placed files, no build |
| 3 | 240 + 96 + 48 + 60 + 48 + 48 + 36 + 24 guard = 600, plus 256 short | ≈ $26 | Four fixture ports, two new graders |
| 4 | 48 + 48 + 24 = 120, plus 120 per tracking run | ≈ $5, plus ≈ $5 per run | Audit fixtures (16 AppHosts) |

For scale, the whole dataset behind REPORT.md was 467 trials and $26.34.

Reporting conventions:

- Each card's Results field links to `results/comparison.md` cells and `results/stats.md`
  rows produced by its round; `ledger.jsonl` rows carry the card ID.
- A card closes with one of `ship`, `revise`, `drop`, `no verdict`, written next to the
  rule it was judged by. A missed rule is a result, not a reason for a re-run.
- Every verdict that becomes an upstream change links the card from its issue or PR, so
  the maintainers see the cells, the n, the p and the guard results, not a summary.
- REPORT.md is updated per phase, not per card: a "Phase N results" section with the
  same before/after table as §8, on the new baseline.

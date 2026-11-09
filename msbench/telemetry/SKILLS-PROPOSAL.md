# Proposed changes to the Aspire agent skills

Target: `microsoft/aspire-skills` (the `aspire` plugin that `aspire agent init` registers
on Aspire `main`), compared at v0.0.5, commit `1117facb`.

Every change below was measured on the [telemetry suite](README.md) against Aspire
`17.1.0-preview.1.26559.1+4954c76a`. Numbers are medians over all trials of a cell and
come from [results/comparison.md](results/comparison.md); the per-trial rows, run IDs
and hashes are in [results/trials.jsonl](results/trials.jsonl).

## Summary

| Change | Skill | What | Status |
|---|---|---|---|
| **New** | `aspire-diagnose` | A 4.5 KB executable recipe for "a running app is slow, failing or unhealthy": locate with a bounded filter, explain one trace as JSON, confirm at the dependency, fix, verify with the same filter. | Measured. Ready to propose. |
| **New** | `aspire-start` | A 2 KB recipe to start an app, wait, read URLs, and recover a resource that does not come up. | Measured on `cold-start`; see [RESULTS.md](RESULTS.md#cold-start). |
| **Removed** | `aspire` (router) | The 20.7 KB router is removed. Each remaining skill is selected by its own description. | Measured as part of the `lean` set. |
| **Updated** | `aspire-monitoring` | Trigger description narrowed to what the body actually covers (export, standalone dashboard, browser telemetry, deployed-app routing) and it now defers first-line diagnosis to `aspire-diagnose`. Body unchanged. | Measured as part of the `lean` set. |
| Unchanged | `aspire-orchestration`, `aspireify`, `aspire-init`, `aspire-deployment`, `aspire-terminals`, `aspire-project-v2-migration` | Not exercised by these scenarios. No evidence to change or remove them. | - |

The files are in [`common/skills/new`](common/skills/new/aspire-diagnose/SKILL.md),
[`common/skills/start`](common/skills/start/aspire-start/SKILL.md) and
[`common/skills/lean-overrides`](common/skills/lean-overrides/aspire-monitoring/SKILL.md).
[`compose.sh`](common/skills/compose.sh) builds each measured set from the unchanged
v0.0.5 snapshot, so a set differs from `current` by exactly the files listed above.

## Why: what the shipped skills do on a diagnosis task

The shipped skills make an aspirified app **slower and more expensive to diagnose than
the same app without Aspire**, on all three models, and on the cheapest model they also
lower the success rate.

| Scenario / model | Raw app | Shipped skills + MCP (`aspire-skills-mcp`) |
|---|---|---|
| `slow-sql` / luna | 132 s, 492k input tokens, 12/12 | 262 s (+97%), 1.49M tokens (+204%), 6/6 |
| `read-only` / luna | 105 s, 444k tokens, 9/9 | 254 s (+141%), 1.52M tokens (+242%), **2/6** (app works again in 4/6) |
| `slow-sql` / terra | 54 s, 164k tokens, 6/6 | 87 s (+59%), 556k tokens (+239%), 6/6 |
| `read-only` / terra | 56 s, 200k tokens, 6/6 | 72 s (+28%), 449k tokens (+125%), 6/6 |

Three mechanisms, each visible in the trajectories:

1. **The recipe that solves the task is three hops deep.** The duration filter
   (`--search "duration:>500"`) and the other field filters live in
   `aspire-monitoring/references/monitoring.md`. An agent reaches it only through the
   router (20.7 KB), then `aspire-monitoring/SKILL.md` (14.2 KB, mostly standalone
   dashboard, browser logs, dashboard UX and version notes), then the reference (12.9 KB).
   No shipped-skills trial (0 of 48) ran a duration filter.
2. **Routing is unreliable on the cheaper model.** With the eight shipped skills and no
   MCP, luna loaded no skill at all in 4 of 6 trials. Terra and sol loaded
   `aspire-monitoring` in 12 of 12.
3. **The guidance steers toward unbounded output.** "Use `--format Json` for machine
   parsing" yields a 188 KB response for `aspire otel traces --format Json` on this app,
   and every MCP `list_*` call returns about 32 KB. See
   [evidence/agent-surface](evidence/agent-surface/).

## What the proposed set does

`lean` = shipped skills + `aspire-diagnose`, without the router, with the narrowed
`aspire-monitoring` description. No MCP.

| Scenario / model | Raw app | Shipped skills (`aspire-skills`) | Proposed (`aspire-lean`) |
|---|---|---|---|
| `slow-sql` / luna | 132 s, 492k tok, $0.015 | 178 s, 759k tok, $0.022 | **87 s (−34%), 255k tok (−48%), $0.009 (−39%)**, 9/9 |
| `read-only` / luna | 105 s, 444k tok, $0.013 | 207 s, 1.22M tok, $0.029 | **89 s (−16%), 335k tok (−25%), $0.011 (−20%)**, 12/12 |
| `slow-sql` / terra | 54 s, 164k tok, $0.054 | 80 s, 391k tok, $0.087 | 61 s (+13%), 215k tok (+31%), $0.056 (+5%), 6/6 |
| `read-only` / terra | 56 s, 200k tok, $0.060 | 66 s, 348k tok, $0.077 | 52 s (−8%), 202k tok (+1%), $0.051 (−16%), 6/6 |

Percentages are against the raw app. Against the shipped skills the proposed set is
21% to 55% faster and uses 42% to 75% fewer input tokens in every cell.

- `aspire-diagnose` was loaded in **41 of 41** graded `lean` trials across the three models.
  Every `slow-sql` trial then ran the duration filter; no shipped-skills trial (0 of 48)
  ever did.
- Against the shipped skills + MCP the improvement is statistically solid: every luna
  and terra cell has p ≤ 0.004 on time, tokens and cost (exact Mann-Whitney, 6 vs 6;
  see [results/stats.md](results/stats.md)).
- Against the raw app: **a win on the cheapest model, parity on the stronger ones.**
  On luna `slow-sql` the proposed set is 34% faster with 48% fewer input tokens and 39%
  lower cost (p = 0.04, 0.01, 0.01; 9 vs 12). On luna `read-only` the medians are 16% to
  25% lower but do not reach significance (p = 0.08 to 0.19; 12 vs 9). On terra
  `slow-sql` it is 13% slower than raw (7 s, p = 0.024); on terra `read-only` and on sol
  there is no detectable difference. Stronger models extract the same evidence from the
  raw app's log file about as quickly.

## Why remove the router rather than add next to it

`aspire-plus` keeps all eight shipped skills and only adds `aspire-diagnose`.

| Model | `aspire-diagnose` loaded | Other skill loaded instead |
|---|---|---|
| terra | 6 of 6 | - |
| luna | 4 of 6 | router 1, `aspire-monitoring` 1, none 1 |

On `read-only` / luna the additive set took 167 s and 799k tokens against 93 s and
301k for `lean`. The router's description claims every Aspire verb
("…describe/ps/logs/otel…"), so it competes with the focused skill for the same
prompt, and the cheaper model does not resolve that competition consistently.
With the router gone and `aspire-monitoring` narrowed, selection was 12 of 12 on luna.

This is evidence about a diagnosis prompt. The router's other jobs (AppHost detection,
guardrails before edits) were not exercised here. If they are needed, they should move
into the skills that act on them rather than sit in front of every task.

## Design rules that the measurements support

1. **One skill per task the user would name, with the commands in the skill body.**
   No reference hop for the main path.
2. **Every command in a recipe is bounded** (`-n`, a filter, or a single ID). Table
   output to locate, JSON only for one item.
3. **Say what the output means.** The span-pattern table in `aspire-diagnose`
   (one slow child, many similar children, uncovered time, error under a 200) is what
   turns a trace into a next action.
4. **Name the next tool at the boundary.** Aspire's telemetry ends at the dependency;
   the skill gives the exact `docker exec … psql` form using `container.id` from
   `aspire describe`, which is where earlier pilots lost time on credentials.
5. **Trigger descriptions state symptoms, not command names.** "slow, failing,
   unhealthy, find the root cause" selected the skill 32 of 32; a list of verbs did not.
6. **A description must exclude what a neighbour owns.** `aspire-monitoring` now says
   "DO NOT USE FOR: finding why a running local app is slow, failing or unhealthy".

## Limits

- One application (Bingo: Blazor/SignalR backend, worker, Vue frontend, PostgreSQL,
  Redis), two database-side faults and one cold start. Held-out applications and
  application-code faults are not covered.
- `aspire-diagnose` names PostgreSQL and Redis at the dependency step. The first two
  steps are dependency-neutral; the third needs equivalents for other integrations.
- The aspirified app has PostgreSQL client tracing and the raw app has none, so the
  product comparison combines instrumentation with tooling.
- n is 3 to 12 per cell. [results/stats.md](results/stats.md) gives an exact test for
  each headline comparison; cells with 3 trials per arm cannot show significance and
  are reported as medians only.

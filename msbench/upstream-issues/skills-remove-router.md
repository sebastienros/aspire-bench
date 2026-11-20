---
repo: microsoft/aspire-skills
title: "Remove the `aspire` router skill; let each remaining skill be selected by its own description"
finding: F17, F21
labels: []
status: draft
issue:
---

## Summary

The 22 KB `aspire` router claims every Aspire verb in its description ("…describe/ps/logs/otel…"), so it competes
with any focused skill for the same prompt. Its cost shows even when it is rarely loaded: in the two cheapest-model cells below the router
itself was loaded in 2 of 6 shipped-set trials on the read-only fault and 0 of 6 on slow SQL, yet removing it
changed which skill the agent loaded and how soon the fault reached the screen; the full mechanism is not
determinable from those cells. We measured v0.0.6 with the `aspire` folder deleted and nothing else changed
(`aspire-skills-norouter`) against v0.0.6 as shipped, in the same rounds, on an aspirified sample application
with injected faults (aspire-bench telemetry suite; MSBench, Copilot CLI 1.0.99, Aspire daily
`17.1.0-preview.1.26567.3+30326eb8`, six trials per cell unless stated).

**Diagnosis prompts ("the app is slow, find out why and fix it").** On `gpt-6-luna`, removing the router took 0.50×
the time on a slow-SQL fault (136 s against 271 s, p = 0.065; input tokens 0.50×, p = 0.041) and 0.67× on a read-only
database fault (157 s against 234 s, p = 0.24; tokens 0.65×, p = 0.041), same round. Across the pin's rounds the read-only gain holds
(0.61×, p = 0.032, 12 baseline trials) and the slow-SQL one is not established (0.74×, p = 0.37): the shipped set's
own luna median moved between 147 and 271 s over four rounds. `gpt-6.1-terra` moved the same way, less (0.90× and
0.75×, p = 0.13). The router itself was loaded in 0 of 6 shipped-set luna slow-SQL trials (2 of 6 on read-only), so its cost is not its
body: without it `aspire-monitoring` was loaded in 3 of 6 trials instead of 5 of 6, the slow statement reached the screen
at 53 s instead of 84 s, with 38 tool calls instead of 63.

**The stronger models load the same skills.** With the shipped set and MCP against the raw app (that round had no
router-free arm, so this is what was loaded, not the router's cost), `claude-opus-5.5` loaded the router in 9 of 18
diagnosis trials, `aspire-monitoring` in 4 and no skill in 5; `gpt-6.2-sol` loaded `aspire-monitoring` 18 of 18
(router 6 of 18). The shipped set cost both models time on the faults whose evidence is in the app's own log
(+20 % to +91 %, p ≤ 0.065); a router-free set built around a focused diagnosis skill was 1.11× the shipped set on
Opus slow SQL and 0.71× on read-only, so on Opus the router is not the whole cost.

**On a new job.** "Publish and run the production build locally" on a Docker Compose AppHost, with
`aspire-deployment` removed from the bundle: the router was loaded first in 5 of 6 luna trials and the bundle took
1.37× the shipped set's time (382.6 against 279.9 s, interval 0.91–1.71, p 0.24; all 12 passed); on terra the router
went first 6 of 6 at 1.04×. Same direction as the diagnosis cells, at p = 0.24.

**The router's guardrail job.** "Restart a stuck database without losing state", 48 trials across both models: the
bundle without the router passed 6 of 6 in every cell, like the bundle, and no trial on any arm ran a destructive
command. `aspire-orchestration`'s `safety-guardrails.md` carries the same rules; the router was loaded in 3 of 18
shipped-set trials and those three restarted like the rest. A ceiling result: it shows the router's copy was not
needed here, not that it never prevents anything.

**Every job the router fronted needs an owner.** Start/restart: on a cold start without the router, every luna and
terra trial loaded `aspire-orchestration` (6 of 6 per model, as with the router) and time was level with the shipped set (luna 78 s
against 73 s, p = 0.49; terra 0.99×). We also measured a dedicated 2 KB `aspire-start` skill: 53 s against 61 s on
luna (1.16×, p = 0.004), nothing on terra or sol, under the 1.20 bar we had set, so we do not propose it. An
`AGENTS.md` beside the AppHost did the start job as well (proposed separately on microsoft/aspire). Diagnosis:
`aspire-monitoring` today, or a focused diagnosis skill (companion issue). Narrowing only `aspire-monitoring`'s
description with the router kept did not help (same round: luna slow-SQL 1.34×, p = 0.09, read-only 0.95×; pooled
over the pin's rounds, slow-SQL +53 %, p = 0.031), so description changes go with the removal and with an owner for
diagnosis, not instead of them.

## Proposal

1. Remove the `aspire` router skill.
2. Make each remaining skill's description state the symptoms or tasks it owns and exclude what a neighbour owns.
   For `aspire-monitoring` that means OTLP export and configuration, the standalone dashboard, browser telemetry and
   routing telemetry from a deployed app, and not "why is my running app slow", once a diagnosis owner exists
   (companion issue); this item was not in the measured arm, and alone it did not help (above).
3. Keep the "check before you edit" guardrails in the skills that edit, where `aspire-orchestration` already has
   them.

## Caveats

- Six trials per cell; one application; one harness (Copilot CLI). The slow-SQL gain is not established across
  rounds.
- Whether removing the router still costs luna a cold start is unsettled: against another round's shipped-set cell
  the no-router arm is 1.31×, but the shipped set itself moved 1.24× between those rounds.
- The guardrail scenario was at ceiling on every arm.

## Evidence

aspire-bench telemetry suite, PLAN cards T1.3 (round `t13`), T1.8 (`t18`), T3.4 (`t34`), T3.8 (`t38`), T1.6 (`t16`),
T1.2 (`t12`); FINDINGS F17 and F21. The measured arm is v0.0.6 at `e529b608` minus `skills/aspire`.

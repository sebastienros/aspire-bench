# Skill sets

| Set | Source | Notes |
|---|---|---|
| `current` | `microsoft/aspire-skills` @ `e529b608336cd41c1b1262aa76d00d9e4ef1bff8` (v0.0.6, tagged 2026-11-17), `skills/` | Byte-identical copy of the eight skills the `aspire` marketplace plugin ships (the plugin manifest `.plugin/plugin.json` sets `"skills": "./skills/"`; `.github/plugins/aspire-skills/skills/` is per-file symlinks into it), without the `evals/` folders; this is what `aspire agent init` registers on Aspire `main`. Copied 2026-11-17. MIT, see `current/LICENSE`. |
| `mon` (PLAN T1.2) | `current` + `lean-overrides/aspire-monitoring/SKILL.md` | One change on the shipped set: `aspire-monitoring`'s frontmatter description replaced by the lean one (and its `FOR SINGLE OPERATIONS` line dropped); body, router and every other skill byte-identical to `current`. The description names `aspire-diagnose`, which this set does not contain. Arm `aspire-skills-mon`. Added 2026-11-18. |
| `norouter` (PLAN T1.3, T3.8 `bundle-minus`) | `current` without `aspire/` | One change on the shipped set: the router removed, nothing added. Arm `aspire-skills-norouter`. Added 2026-11-18. |
| `lean-noorch` (PLAN T2.11) | `lean` without `aspire-orchestration/` | The start job moves to `AGENTS.md` v2 (`common/agents-md/lean-noorch-v2.md`). Arm `aspire-lean-noorch-agents`. Added 2026-11-19. |
| `lean-start-wait` (PLAN T2.2) | `lean` + `start-wait/aspire-start/SKILL.md` | `aspire-start` with the same description, its start flow rewritten to one `aspire start --non-interactive --wait` (needs the `cli-start-wait` patch). Arm `aspire-lean-start-wait`. Added 2026-11-19. |
| `lean-tracetable` (PLAN T2.3) | `lean` + `diagnose-table/aspire-diagnose/SKILL.md` | `aspire-diagnose` with step 2 reading `aspire otel traces -t <id>` (the tree) instead of JSON (needs the `cli-trace-detail` patch); every other line unchanged. Arm `aspire-lean-tracetable`. Added 2026-11-19. |
| `lean-mcpstep` (PLAN T2.8) | `lean` + `mcp-step/aspire-diagnose/SKILL.md` | `aspire-diagnose` with four sentences at the top of step 3: the MCP tools cover steps 1, 2 and 4, none shows a dependency's own state, so for step 3 leave MCP and run the commands below with the shell; every other line unchanged. Arm `aspire-lean-mcp-all-step` (with `agentic-all`). Added 2026-11-19. |
| `lean-connect` (PLAN T2.6) | `lean` + `connect-overrides/aspire-diagnose/SKILL.md` | `aspire-diagnose` with step 3 reduced to "`aspire describe <resource> --format Json`, then `<connect.command> <the tool's arguments>`" and generic advice naming no server, tool or port (needs the `describe-connect` patch); steps 1, 2 and 4 unchanged. Arm `aspire-lean-connect`. Added 2026-11-19. |
| `lean-spanrow` (PLAN T2.5 follow-up) | `lean` + `spanrow-overrides/aspire-diagnose/SKILL.md` | `aspire-diagnose` with one row added to step 2's span table ("many near-identical client spans to one dependency, each slow → the dependency is slow, go to step 3"); nothing else changed. Arms `aspire-lean-spanrow`, `-spanrow-traced`, `aspire-lean-mcp-all-spanrow`, `-spanrow-traced`. Added 2026-11-19. |
| `current` before 2026-11-17 | `microsoft/aspire-skills` @ `1117facb04b403dd2fc15f048bc0e63fc67c502f` (v0.0.5), same path | What REPORT.md and every round up to `r7b` measured (pin `2026-11-09`). Recover it with `git show 942d1b9:msbench/telemetry/common/skills/current/...`. |

The benchmark copies a set into `/app/.github/skills` (Copilot CLI project-skill
discovery) instead of running the marketplace installer, so the image build
needs no agent-side plugin tooling. Skill content, names and descriptions are
unchanged; plugin extensions (canvas UIs) are not part of the treatment.

## Suite-authored files

| Set member | Path | History |
|---|---|---|
| `aspire-diagnose` (new) | `new/aspire-diagnose/SKILL.md` | Written for this suite. Rounds 1–5 measured the version without the cache paragraph in step 3 (`SLOWLOG GET` / `CLIENT LIST`, 4 lines), which was added for the `slow-redis` scenario before round 6. The SQL path is unchanged. |
| `aspire-start` (new) | `start/aspire-start/SKILL.md` | Written for this suite; measured on `cold-start` (round 4b). |
| `aspire-monitoring` (updated) | `lean-overrides/aspire-monitoring/SKILL.md` | Description narrowed (and the `FOR SINGLE OPERATIONS` line dropped); the rest byte-identical to v0.0.6. Re-derived 2026-11-17 by applying the same frontmatter change to the v0.0.6 file; until then it was the v0.0.5 body. |

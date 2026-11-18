# Skill sets

| Set | Source | Notes |
|---|---|---|
| `current` | `microsoft/aspire-skills` @ `e529b608336cd41c1b1262aa76d00d9e4ef1bff8` (v0.0.6, tagged 2026-11-17), `skills/` | Byte-identical copy of the eight skills the `aspire` marketplace plugin ships (the plugin manifest `.plugin/plugin.json` sets `"skills": "./skills/"`; `.github/plugins/aspire-skills/skills/` is per-file symlinks into it), without the `evals/` folders; this is what `aspire agent init` registers on Aspire `main`. Copied 2026-11-17. MIT, see `current/LICENSE`. |
| `mon` (PLAN T1.2) | `current` + `lean-overrides/aspire-monitoring/SKILL.md` | One change on the shipped set: `aspire-monitoring`'s frontmatter description replaced by the lean one (and its `FOR SINGLE OPERATIONS` line dropped); body, router and every other skill byte-identical to `current`. The description names `aspire-diagnose`, which this set does not contain. Arm `aspire-skills-mon`. Added 2026-11-18. |
| `norouter` (PLAN T1.3, T3.8 `bundle-minus`) | `current` without `aspire/` | One change on the shipped set: the router removed, nothing added. Arm `aspire-skills-norouter`. Added 2026-11-18. |
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

# Skill sets

| Set | Source | Notes |
|---|---|---|
| `current` | `microsoft/aspire-skills` @ `1117facb04b403dd2fc15f048bc0e63fc67c502f` (v0.0.5), `.github/plugins/aspire-skills/skills/` | Byte-identical copy of the eight skills the `aspire` marketplace plugin ships; this is what `aspire agent init` registers on Aspire `main`. MIT, see `current/LICENSE`. |

The benchmark copies a set into `/app/.github/skills` (Copilot CLI project-skill
discovery) instead of running the marketplace installer, so the image build
needs no agent-side plugin tooling. Skill content, names and descriptions are
unchanged; plugin extensions (canvas UIs) are not part of the treatment.

## Suite-authored files

| Set member | Path | History |
|---|---|---|
| `aspire-diagnose` (new) | `new/aspire-diagnose/SKILL.md` | Written for this suite. Rounds 1–5 measured the version without the cache paragraph in step 3 (`SLOWLOG GET` / `CLIENT LIST`, 4 lines), which was added for the `slow-redis` scenario before round 6. The SQL path is unchanged. |
| `aspire-start` (new) | `start/aspire-start/SKILL.md` | Written for this suite; measured on `cold-start` (round 4b). |
| `aspire-monitoring` (updated) | `lean-overrides/aspire-monitoring/SKILL.md` | Description narrowed; body byte-identical to v0.0.5. |

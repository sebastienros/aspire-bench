# Tracking: `leak` on slow-sql / gpt-6-luna / aspire-skills (run `t01b`)

Draft written by `tools/track_drafts.py` (PLAN T4.5). Not filed.

## The row

| | This run | Trailing window |
|---|---|---|
| Runs | `t01b` | `2026-11-09` |
| Pass | 3/3 | 1.00 |
| Agent s (median) | 102 | – |
| Time × raw | 1.26 | 2.10 |
| Tokens × raw | 1.42 | 2.21 |
| Change vs trailing (time, tokens) | -0.40, -0.36 | p 0.7000, 0.2000 |
| Skill selection | 33% | – |
| Harness leaks | 1 | – |

All flags on the row: leak, selection-low.

## The two runs (MSBench run IDs)

- **`t01b`**: aspire-skills 2026111819750800, 2026111819751444, 2026111819752052; raw 2026111819627812, 2026111819628522, 2026111819629156, 2026111819629782, 2026111819630428, 2026111819631080
- **`2026-11-09`** (latest in the window): aspire-skills 2026110962168918, 2026110962169568, 2026110962170180; raw 2026111002695294, 2026111002695958, 2026111002696560, 2026111006416468, 2026111006417126, 2026111006417754, 2026111006418358, 2026111006418972, 2026111006419572

## Diff of pins

| | `2026-11-09` | `t01b` |
|---|---|---|
| Pin (changed) | 2026-11-09 | 2026-11-17 |
| Aspire build (changed) | – | 17.1.0-preview.1.26567.3+30326eb876d6897b1feadc8bc800f78e466b1b52 |
| Skills (changed) | – | v0.0.6 e529b608336cd41c1b1262aa76d00d9e4ef1bff8 |
| Task commit (changed) | – | 0dfaf98fce53 |
| Agent package | – | – |
| Rounds (changed) | r1 | t01b-plugin |

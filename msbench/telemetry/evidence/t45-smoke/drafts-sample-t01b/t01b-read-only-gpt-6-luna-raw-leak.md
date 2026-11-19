# Tracking: `leak` on read-only / gpt-6-luna / raw (run `t01b`)

Draft written by `tools/track_drafts.py` (PLAN T4.5). Not filed.

## The row

| | This run | Trailing window |
|---|---|---|
| Runs | `t01b` | `2026-11-09` |
| Pass | 5/5 | 1.00 |
| Agent s (median) | 112 | – |
| Time × raw | 1.00 | 1.00 |
| Tokens × raw | 1.00 | 1.00 |
| Change vs trailing (time, tokens) | 0.00, 0.00 | p 0.8232, 1.0000 |
| Skill selection | 0% | – |
| Harness leaks | 1 | – |

All flags on the row: leak.

## The two runs (MSBench run IDs)

- **`t01b`**: raw 2026111819657806, 2026111819658496, 2026111819659130, 2026111819659752, 2026111819660396, 2026111819661040; raw 2026111819657806, 2026111819658496, 2026111819659130, 2026111819659752, 2026111819660396, 2026111819661040
- **`2026-11-09`** (latest in the window): raw 2026111002700336, 2026111002700994, 2026111002701602, 2026111006435420, 2026111006436064, 2026111006436660, 2026111006437268, 2026111006437878, 2026111006438500; raw 2026111002700336, 2026111002700994, 2026111002701602, 2026111006435420, 2026111006436064, 2026111006436660, 2026111006437268, 2026111006437878, 2026111006438500

## Diff of pins

| | `2026-11-09` | `t01b` |
|---|---|---|
| Pin (changed) | 2026-11-09 | 2026-11-17 |
| Aspire build (changed) | – | 17.1.0-preview.1.26567.3+30326eb876d6897b1feadc8bc800f78e466b1b52 |
| Skills (changed) | – | v0.0.6 e529b608336cd41c1b1262aa76d00d9e4ef1bff8 |
| Task commit (changed) | – | 0dfaf98fce53 |
| Agent package | – | – |
| Rounds (changed) | r7, r7b | t01b |

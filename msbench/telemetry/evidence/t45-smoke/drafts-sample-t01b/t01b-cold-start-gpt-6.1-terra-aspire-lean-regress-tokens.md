# Tracking: `regress-tokens` on cold-start / gpt-6.1-terra / aspire-lean (run `t01b`)

Draft written by `tools/track_drafts.py` (PLAN T4.5). Not filed.

## The row

| | This run | Trailing window |
|---|---|---|
| Runs | `t01b` | `2026-11-09` |
| Pass | 6/6 | 1.00 |
| Agent s (median) | 58 | – |
| Time × raw | 1.35 | 1.41 |
| Tokens × raw | 2.46 | 1.95 |
| Change vs trailing (time, tokens) | -0.04, 0.26 | p 0.2500, 0.0238 |
| Skill selection | 100% | – |
| Harness leaks | 0 | – |

All flags on the row: regress-tokens.

## The two runs (MSBench run IDs)

- **`t01b`**: aspire-lean 2026111819921996, 2026111819922632, 2026111819923252, 2026111819923944, 2026111819924560, 2026111819925162; raw 2026111819900612, 2026111819901254, 2026111819901864, 2026111819902456, 2026111819903060, 2026111819903676
- **`2026-11-09`** (latest in the window): aspire-lean 2026110977817014, 2026110978678048, 2026110978678696; raw 2026111002720482, 2026111002721144, 2026111002721760

## Diff of pins

| | `2026-11-09` | `t01b` |
|---|---|---|
| Pin (changed) | 2026-11-09 | 2026-11-17 |
| Aspire build (changed) | – | 17.1.0-preview.1.26567.3+30326eb876d6897b1feadc8bc800f78e466b1b52 |
| Skills (changed) | – | v0.0.6 e529b608336cd41c1b1262aa76d00d9e4ef1bff8 |
| Task commit (changed) | – | 0dfaf98fce53 |
| Agent package | – | – |
| Rounds (changed) | r4b | t01b |

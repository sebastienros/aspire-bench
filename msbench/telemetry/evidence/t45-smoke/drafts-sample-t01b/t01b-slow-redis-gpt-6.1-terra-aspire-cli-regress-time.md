# Tracking: `regress-time` on slow-redis / gpt-6.1-terra / aspire-cli (run `t01b`)

Draft written by `tools/track_drafts.py` (PLAN T4.5). Not filed.

## The row

| | This run | Trailing window |
|---|---|---|
| Runs | `t01b` | `2026-11-09` |
| Pass | 6/6 | 1.00 |
| Agent s (median) | 168 | – |
| Time × raw | 1.03 | 0.60 |
| Tokens × raw | 1.57 | 0.93 |
| Change vs trailing (time, tokens) | 0.71, 0.69 | p 0.0476, 0.0952 |
| Skill selection | 0% | – |
| Harness leaks | 0 | – |

All flags on the row: regress-time.

## The two runs (MSBench run IDs)

- **`t01b`**: aspire-cli 2026111819879070, 2026111819879764, 2026111819880408, 2026111819881014, 2026111819881660, 2026111819882302; raw 2026111819872030, 2026111819872664, 2026111819873266, 2026111819873886, 2026111819874508, 2026111819875128
- **`2026-11-09`** (latest in the window): aspire-cli 2026111002649262, 2026111002649922, 2026111002650552; raw 2026111002644192, 2026111002644856, 2026111002645462

## Diff of pins

| | `2026-11-09` | `t01b` |
|---|---|---|
| Pin (changed) | 2026-11-09 | 2026-11-17 |
| Aspire build (changed) | – | 17.1.0-preview.1.26567.3+30326eb876d6897b1feadc8bc800f78e466b1b52 |
| Skills (changed) | – | v0.0.6 e529b608336cd41c1b1262aa76d00d9e4ef1bff8 |
| Task commit (changed) | – | 0dfaf98fce53 |
| Agent package | – | – |
| Rounds (changed) | r6 | t01b |

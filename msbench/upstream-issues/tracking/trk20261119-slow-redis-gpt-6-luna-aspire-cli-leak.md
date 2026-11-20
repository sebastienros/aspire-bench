# Tracking: `leak` on slow-redis / gpt-6-luna / aspire-cli (run `trk20261119`)

Draft written by `tools/track_drafts.py` (PLAN T4.5). Not filed.

## The row

| | This run | Trailing window |
|---|---|---|
| Runs | `trk20261119` | `2026-11-09`, `t01b`, `t25` |
| Pass | 0/5 | 0.06 |
| Agent s (median) | 148 | – |
| Time × raw | 0.87 | 0.57 |
| Tokens × raw | 1.00 | 0.95 |
| Change vs trailing (time, tokens) | 0.54, 0.05 | p 0.0667, 0.3630 |
| Skill selection | 0% | – |
| Harness leaks | 1 | – |

All flags on the row: leak.

## The two runs (MSBench run IDs)

- **`trk20261119`**: aspire-cli 2026112009189668, 2026112009190348, 2026112009190952, 2026112009191724, 2026112009192336; raw 2026112009174948, 2026112009175632, 2026112009176248, 2026112009176848, 2026112009177452
- **`t25`** (latest in the window): aspire-cli 2026111918249426, 2026111918250718, 2026111918251892, 2026111918252814, 2026111918253622, 2026111918254384; raw 2026111918273686, 2026111918274700, 2026111918275424, 2026111918276144, 2026111918276882, 2026111918277586

## Diff of pins

| | `t25` | `trk20261119` |
|---|---|---|
| Pin (changed) | 2026-11-17 | 2026-11-19 |
| Aspire build (changed) | 17.1.0-preview.1.26567.3+30326eb876d6897b1feadc8bc800f78e466b1b52 | 17.1.0-preview.1.26569.1+4ad3cfe685bcf47d79c8d16d64fc4be6363280dd |
| Skills | v0.0.6 e529b608336cd41c1b1262aa76d00d9e4ef1bff8 | v0.0.6 e529b608336cd41c1b1262aa76d00d9e4ef1bff8 |
| Task commit (changed) | 1479041e4195 | f1b9e05be340 |
| Agent package | github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 | github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627 |
| Rounds (changed) | t25 | trk20261119 |

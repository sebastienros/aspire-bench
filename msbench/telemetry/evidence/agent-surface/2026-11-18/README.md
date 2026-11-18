# CLI output bytes at pin 2026-11-17, official daily vs source control vs patch 0002 (T1.5)

Measured 2026-11-18 in one local cell (`CLI_PATCH=cli-plain-output bash tools/local.sh up aspire lean slow-sql`,
suite `305a8ed`, arm64), against **one running AppHost** under live traffic. Three CLIs ran the same commands
back to back, from `/app`, with stdout redirected to a file (not a TTY), as an agent's tool call does
(`measure.sh`):

| CLI | Path in the image | `--version` |
|---|---|---|
| official | `/usr/local/aspire/aspire` (daily; also starts the AppHost) | `17.1.0-preview.1.26567.3+30326eb876d6897b1feadc8bc800f78e466b1b52` |
| control | `/usr/local/aspire-control/aspire` (`Dockerfile` stage `cli-source`, `CLI_PATCH=control`, copied in) | `17.1.0-agentic.control+30326eb8…` |
| patched | `/usr/local/aspire-source/aspire` (`CLI_PATCH=cli-plain-output`, on `PATH`) | `17.1.0-agentic.cliplainoutput+30326eb8…` |

Bytes on stdout (stderr in brackets where not empty):

| Command | official | control | patched | patched vs control |
|---|---:|---:|---:|---:|
| `aspire describe` | 5,282 | 5,282 | 1,221 | −77 % |
| `aspire describe --format Json` | 24,868 (+33) | 24,868 (+33) | 24,868 (+33) | 0 (byte-identical) |
| `aspire otel traces -n 15 --search duration:>500` | 6,863 | 6,863 | 1,561 | −77 % |
| `aspire otel traces` | 31,258 | 31,258 | 12,280 | −61 % |
| `aspire otel spans -n 20` | 3,327 | 3,386 | 1,456 | −57 % |
| `aspire otel logs -n 20` | 3,916 | 3,916 | 3,916 | 0 |

- `describe` table and JSON from official and control are byte-identical (`cmp`), so the source build
  itself changes nothing; the table difference is patch 0002 alone. The JSON is identical across all three.
- The official daily reproduces T0.1's table (5,282 bytes, `../2026-11-17/cli-describe.txt`). T0.1's JSON
  count, 24,902, is this run's stdout (24,868) plus the 33-byte `Scanning for running AppHosts...` line,
  which `describe --format Json` writes to **stderr** while the table form writes it to stdout.
- Patched `describe` keeps every endpoint URL (`http://localhost:…/`, `…/squares-management`, `tcp://`,
  `rediss://`); it drops the box borders and the per-resource dashboard link
  (`http://localhost:<dashboard>/?resource=…`), which on this daily wraps every row onto a third line.
  Columns are still space-padded (trailing spaces on each row).
- Trace and span lists depend on live traffic; `spans` differ by content between runs (different spans),
  the others happened to be the same size. Logs are not a table and do not change.
- 2026-11-09 pin for reference (`../cli-plain-sizes.txt`): `describe` 4,244 → 1,086; slow traces 6,863 → 1,561;
  all traces 31,258 → 12,280; spans 3,327 → 1,399; logs unchanged.

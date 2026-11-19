# MCP tool output at pin 2026-11-17: control, patch 0001, T2.1 (`mcp-compact2`), T2.7 (`mcp-tools8`)

Measured 2026-11-18 in one local cell: the `aspire lean slow-sql` image (arm64, built by another lane from the
current suite) with the Bingo AppHost started by the image's setup under live traffic. Four CLIs were built from
source at `30326eb8`, as the `-src` arms build them (`Dockerfile` stage `cli-source`, one `CLI_PATCH` each). Each
was copied to `/usr/local/p2mcp/<cli>/`. Its MCP server (`aspire agent mcp --non-interactive --nologo`, from
`/app`) answered `tools/list` and the same calls back to back through `tools/mcp-probe.mjs` (`measure.sh`). The
`<cli>.txt` files hold the probe's full print: each tool's schema bytes, then each call's result size and its first
100,000 characters. Versions are in `aspire-versions.txt`.

Characters of the result's text content (what Copilot CLI hands the model when the result is under about 20 KB;
over that it substitutes an 837-character notice with a 500-character preview, FINDINGS F31). A 0 is an argument
the CLI does not accept (protocol error).

| Tool | Arguments | control | 0001 | compact2 (T2.1) | tools8 (T2.7) |
|---|---|---:|---:|---:|---:|
| `tools/list` | - | 15 tools, 9,494 B | 15 tools, 10,624 B | 15 tools, 11,405 B | 8 tools, 5,145 B |
| `list_resources` | `{}` | 10,321 | 10,321 | **1,360** | 10,321 |
| `list_resources` | `{"details":true}` | 0 | 0 | 10,321 | 0 |
| `list_resources` | `{"resourceName":"cache"}` | 0 | 0 | 454 | 0 |
| `list_resources` | `{"resourceName":"cache","details":true}` | 0 | 0 | 1,464 | 0 |
| `list_console_logs` | `{"resourceName":"boardadmin"}` | 34,707 | 34,711 | **3,126** | 34,735 |
| `list_console_logs` | `{"resourceName":"boardadmin","severity":"Error"}` | 34,709 (ignored) | 34,710 | 59 (no error line) | 34,735 |
| `list_console_logs` | `{"resourceName":"boardadmin","limit":2000}` | 34,706 (ignored) | 34,707 | 34,801 | 34,735 |
| `list_console_logs` | `{"resourceName":"postgres"}` | 8,416 | 8,416 | 5,092 | 8,416 |
| `list_console_logs` | `{"resourceName":"postgres","severity":"Error"}` | 8,416 (ignored) | 8,416 | 371 | 8,416 |
| `list_console_logs` | `{"resourceName":"cache"}` | 2,380 | 2,380 | 2,412 | 2,380 |
| `list_console_logs` | `{"resourceName":"bingoboard"}` | 682 | 682 | 682 | 682 |
| `list_traces` | `{}` | 31,808 | 8,613 | 8,996 | 31,443 |
| `list_structured_logs` | `{}` | 33,012 | 14,379 | 14,431 | 32,662 |
| `list_apphosts` | `{}` | 322 | 322 | 322 | 322 |

- **Against the 20 KB spill threshold.** On the unpatched server, `list_console_logs` for the busy project
  (`boardadmin`, 34.7 KB; the 8k-token cap, about 600 of its 3,600 lines), `list_traces` and `list_structured_logs`
  are over it, so the model sees a notice. `list_resources` (10.3 KB) is under it and reaches the model whole at
  every call. With compact2 no default call is over 15 KB: `list_resources` −87 %, `boardadmin` console logs −91 %
  (the latest 50 lines). Asking for `limit: 2000` returns the capped 34.8 KB again, which spills.
- **Traces and structured logs** are patch 0001's; compact2 carries it unchanged (the differences are live traffic).
- **The schema grows with every argument.** Patch 0001 added 1,130 bytes to `tools/list`, compact2 another 781
  (`details`, `resourceName`, `severity`, `limit`, longer descriptions). The schema is paid on every model call
  (T2.7).
- **tools8** lists exactly `list_resources`, `wait_for_resources`, `list_console_logs`, `execute_resource_command`,
  `list_structured_logs`, `list_traces`, `list_trace_structured_logs`, `list_apphosts`. Schema 9,494 → 5,145 bytes
  (−4,349, −46 %). Per-tool schema bytes on the control: `search_docs` 886, `list_resources` 877, `get_doc` 809,
  `list_traces` 800, `list_integrations` 773, `execute_resource_command` 713, `list_console_logs` 688,
  `list_trace_structured_logs` 685, `doctor` 646, `list_structured_logs` 555, `list_docs` 534, `wait_for_resources`
  510, `select_apphost` 439, `list_apphosts` 308, `refresh_tools` 255. The seven removed ones are 4,342 bytes; the three
  docs tools alone are 2,229. The only text that still names a removed tool is the error for several AppHosts in scope
  (`AppHostConnectionHelper`: "Use 'select_apphost'…"), which no scenario reaches (one AppHost in `/app`).
- **Severity filter.** PostgreSQL writes every line to stderr, so stderr alone cannot mean "error". The first build
  counted the stderr flag and returned 28 of postgres's lines for `severity: Error`, most of them `LOG:`. The measured
  build (`sebros/p2-mcp-compact2` `dd954cc7d1`) lets a level marker (`LOG:`, `info:`, `[INF]`, …) override the stream,
  keeps `DETAIL/HINT/STATEMENT` and indented lines after a kept line, and returns the 5 lines above (`FATAL`,
  `ERROR`, `STATEMENT` and its two continuation lines). `boardadmin` has no error line, and its startup warnings have
  left the 2,000-line console buffer, hence 59 characters (the empty-result frame) for `Warning` too.
- The image's `aspire` on `PATH` is a `cli-plain-output` build (another lane's local tag: `local.sh` tags images
  by kind, skills and fault, not by patch). The probe used the four binaries by path, so this changes nothing above.

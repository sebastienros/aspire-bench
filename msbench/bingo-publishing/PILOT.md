# P01 production publishing Terra pilot

Both original model attempts passed the native cloud grader, with no exception.
The actual `model.call_start` and `model.call_final_result` events identify
`gpt-6.1-terra`; provenance resolves Copilot CLI `1.0.99-0`. No condition was
repeated. Neither arm exposes a skill or MCP treatment.

| Condition | Run | Native agent seconds | Tool calls | Runner cost USD |
|---|---|---:|---:|---:|
| Raw scripted | [2026110562064652](https://msbenchapp.azurewebsites.net/run-analysis/2026110562064652) | 144.438336 | 36 | 0.09847690 |
| Aspire 13.6 | [2026110562064656](https://msbenchapp.azurewebsites.net/run-analysis/2026110562064656) | 324.509960 | 60 | 0.14063245 |

These are native `agent_execution` durations, not image/setup time or oracle
timings. Aspire took 180.1 seconds longer (2.25 times the raw observation).
One attempt per arm cannot establish a population effect, but this pair does
not demonstrate an Aspire speed or cost advantage.

## What actually passed

Both deployed real published .NET 10 Production and nginx/Vue containers.
The independent verifier checked correct/wrong login, Identity authentication,
version routing, original static bundle, actual WebSocket SignalR catalog and
fresh Redis board, with prior SQL/Redis state and environment-owned dependency,
network and volume identities preserved. No AppHost or Vite process substitutes
for a production workload. The Aspire verifier independently republishes the
agent's AppHost and checks generated Compose against the deployed artifacts.
No protected setup/oracle/verifier path access appeared in tool-start arguments.

Raw used 14 shell calls and 36 total tools; Aspire used 33 shell calls and 60
total tools. Aspire's public shell requests contain 19 `aspire docs` command
mentions across eight invocations, including searches for Compose, external
networks, image tags, dashboard and project naming. Guessed package paths/API
IDs also produced not-found results. This supports a candidate for a concise,
version-matched publishing recipe using returned API IDs, not a claim that the
documentation commands themselves account for all 180 seconds or are defective.
No private model reasoning was inspected or used.

## Gates and immutable inputs

Task graph `ffed19f2b2d4f82360125c1da40a8b302bfd5ba8` uses common snapshot
`7420e30e0934b9ee77a550e9fe3ceffdaded769b` and identical business source
`baacba3e17181491c9a4d419db7d0e6763c3d363` in both arms. Both final public-Git
images were built and smoke-checked locally after the real local production
oracles, loopback UDP/TCP BuildKit DNS proof and negative-case gates passed.
Shared guidance explicitly states the required Compose project/service IDs
before either model submission.

Only after representative native CES oracle
[2026110561495368](https://msbenchapp.azurewebsites.net/run-analysis/2026110561495368)
passed reward 1/no exception were the two model conditions submitted. Its actual
exported plan records configured/upstream `127.0.0.11`, relayed through private
`172.16.0.1`; setup reaches ready and full production grading passes. This
establishes the final remote configuration, not the exact resolver bytes from
the two older failed runs. No public DNS fallback or host DNS/port changes
were used. Historical direct-Docker receipts and failed native setup attempts
remain separate, version-scoped evidence.

[relay-dataset.jsonl](relay-dataset.jsonl) is the current reproducible dataset;
the original [portable dataset](portable-dataset.jsonl) and intermediate
[diagnostic dataset](diagnostic-dataset.jsonl) retain their historical pins.
[execution-ledger.json](execution-ledger.json) binds distinct predeclared
fingerprints to all submissions. [pilot-results.json](pilot-results.json)
contains exact token/cost/tool metrics, raw export hashes and durable evidence
locations. These two trajectories required no invalid-escape normalization.
Exported native task checksums are runner-redacted; exact source provenance
comes from the task commit and recorded per-file SHA-256, not an invented
native checksum.

## Reproduction without an automatic repeat

Inspect the two declared variants with:

```bash
msbench-cli list instances --dataset msbench/bingo-publishing/relay-dataset.jsonl \
  --benchmark bingo-production-publishing --variant aspire --format json
```

The original model submissions used `--agent
github-copilot-cli=github-copilot-cli-pkg-main-20261014-215627`, `--model
gpt-6.1-terra`, exported `USE_COPILOT_CLI_VERSION=1.0.99-0`, `--env
USE_COPILOT_CLI_VERSION`, `--backend ces-staging`, `--acr
msbenchstaging.azurecr.io`, `--workers 1 --num_retries 0 --no-wait`, and disabled
optional analysis with `MSBENCH_DISABLE_RUN_ANALYSIS=1`. Retrieve the recorded
run IDs with `resume`/`extract`; do not resubmit identical conditions.

This is a constrained application-container publishing task against supplied
dependencies, not whole-environment provisioning or universal production
security/architecture equivalence. Costs are runner estimates, not billing;
they exclude oracle, infrastructure and assistant work.

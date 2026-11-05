# D01/H01/resource-S01 Terra pilot

All seven valid model conditions passed the protected grader. Native model
events identify `gpt-6.1-terra` and provenance resolves Copilot CLI `1.0.99-0`
in every case. These are **one observation per condition**, not a significance
test or proof of general Aspire superiority.

Seven original submissions failed before model execution because remote Bake
denied sibling-filesystem build contexts. All original receipts are retained.
Immutable Git contexts with identical runtime contents corrected the graph;
remote oracle-only run 2026110504832466 passed before one labeled infrastructure
replacement per condition. Replacements are the first actual model executions,
not extra independent samples or success-selected retries.

## Actual results

| Condition | Agent seconds | Tool calls | MCP calls | Loaded skill | Runner cost USD |
|---|---:|---:|---:|---|---:|
| Raw scripted | 72.4 | 33 | 0 | None | 0.0881 |
| Aspire CLI, no skills/MCP | 127.4 | 41 | 0 | None | 0.1178 |
| Original skills | 94.1 | 33 | 0 | Monitoring | 0.0994 |
| MCP only | 120.5 | 43 | 7 | None | 0.1096 |
| Original skills + MCP | 68.1 | 31 | 4 | Monitoring | 0.0881 |
| Generated 13.6 skills | 80.6 | 32 | 0 | Monitoring | 0.0951 |
| Description-only focused trigger | 81.5 | 33 | 0 | Monitoring | 0.0995 |

Times use exact native `agent_execution` start/finish boundaries, excluding
queue/build/setup/grading. Costs are runner-reported estimates, not billing;
all seven total approximately USD 0.698, excluding infrastructure/oracle work.

| Condition | Valid model run |
|---|---|
| Raw | [2026110505473298](https://msbenchapp.azurewebsites.net/run-analysis/2026110505473298) |
| CLI only | [2026110505485914](https://msbenchapp.azurewebsites.net/run-analysis/2026110505485914) |
| Skills | [2026110505489912](https://msbenchapp.azurewebsites.net/run-analysis/2026110505489912) |
| MCP | [2026110505477300](https://msbenchapp.azurewebsites.net/run-analysis/2026110505477300) |
| Skills + MCP | [2026110505481250](https://msbenchapp.azurewebsites.net/run-analysis/2026110505481250) |
| Generated | [2026110505497840](https://msbenchapp.azurewebsites.net/run-analysis/2026110505497840) |
| Focused trigger | [2026110505493918](https://msbenchapp.azurewebsites.net/run-analysis/2026110505493918) |

Original failed runs, replacement links, exact fingerprints, model identity,
token/cache metrics, raw-result/trajectory hashes and reader caveats are in
[pilot-ledger.json](pilot-ledger.json) and [pilot-results.json](pilot-results.json).

## Observations and improvement direction

This task naturally exercised runtime tooling, unlike I01. The combined arm
loaded monitoring and used real resource/structured/console-log MCP tools;
its Bash calls were 9 versus 17 for skills-only and 18 for MCP-only.
The best observed run combined guidance with tools, rather than merely exposing
an MCP server. However its 4.3-second advantage over raw is too small and the
sample too small to claim a product-level gain.

Within this case, skills-only was faster than plain CLI and adding MCP to skills
was faster still. MCP alone was only modestly faster than CLI and remained
slower than raw. Do not infer that MCP presence universally helps, force
irrelevant calls, or remove broad skills based on these single observations.

Focused-trigger changed only monitoring's discovery description, not executable
knowledge. It loaded the same monitoring body and finished faster in this
observation, with similar estimated cost and the same total tool count.
That supports a follow-up hypothesis about decision/discovery, not a causal
latency estimate; model/tool scheduling and choice varied.

Generated skills also loaded monitoring, whose body was unchanged. The four
changed generator files are router/init-related. Its lower observed time cannot
be credited to improved monitoring knowledge. The separate generator adoption
condition is designed to exercise the changed init/router surface.

All successful agents recovered the true failed-write operation while preserving
target/neighbor data and identities. Healthy pages/PING/read results alone were
not accepted. The grader's positive/negative proof remains independent of agent
reports and tool preference.

## Trace integrity and limitations

Some native tool-output JSONL lines contain invalid backslash escapes: one each
in MCP and combined, five in CLI-only. Analysis interprets only invalid JSON
escapes as literal backslashes in memory; raw files/hashes are unchanged.
No model/skill/tool-start event was omitted. Normalizations and affected event
types are explicitly recorded, not silently hidden.

One held-out naming instance/fault seed, one model/runner, no controlled
hardware/caches, old-client capability-catalog warning, and non-hardened
root-container grader isolation limit interpretation. All actual model IDs
remain Terra; no model substitution is observed. Resource-scoped neighbor
safety is not full two-app isolation.

Do not repeat identical conditions to seek a win. The next useful evidence is
the different ACL-denial/name transfer case and feature/migration/adoption/
deployment outcomes already in the roadmap.

# X01 held-out ACL fault/name Terra pilot

Both original model conditions passed the native cloud grader. Actual call
events identify `gpt-6.1-terra`, and provenance resolves CLI 1.0.99-0. No repeated
model condition was submitted.

| Condition | Native agent seconds | Tool calls | Runner cost USD |
|---|---:|---:|---:|
| Raw scripted | 49.5 | 20 | 0.0530 |
| Aspire + original skills | 82.4 | 36 | 0.0951 |

The Aspire agent loaded monitoring; raw loaded no skill. Neither accessed the
protected setup/oracle/verifier paths in observed tool-start arguments. Both
restored the target's actual ACL and preserved original credentials/TLS/config,
neighbor data and real SQL/Redis/HTTP operation. The fault is persistent ACL
write denial, not D01's automatically bounded paused writes.

This supplies narrow fault/name transfer feasibility on Bingo, not independent
application/model generalization. The original-skills Aspire sample was slower
and more expensive; that result is retained rather than repeated to seek a win.

D01's promising interaction was **skills plus MCP**, not skills alone. One
additional, genuinely new X01 combined condition was declared and executed
after its local and independent remote gates. App/prompt/grade remained
identical and model tool use was not forced. This is a later exploratory
follow-up, not another raw/skills-only trial or an independent application
sample.

| New condition | Native agent seconds | Tool calls | Runner cost USD |
|---|---:|---:|---:|
| Aspire + original skills + MCP | 98.645066 | 47 | 0.1173459 |

Run [2026110562064654](https://msbenchapp.azurewebsites.net/run-analysis/2026110562064654)
passed native reward 1/no exception with the same verified model/client.
The agent loaded the router and monitoring, then actually used **nine MCP
calls** across resources, traces, structured logs and console logs. All nine
completed successfully; actual NOPERM appeared in the log responses. No
protected-path access was observed. This trajectory required no JSON escape
normalization.

Capability and natural MCP use therefore transfer to this fault, but the
observed timing advantage does **not**: combined was slower than both
original-skill Aspire (82.4 s) and raw (49.5 s), and cost more. Nine real calls
are not by themselves an efficiency benefit. No repeat was made to seek a win.
[SKILLS-MCP.md](SKILLS-MCP.md) retains the exact protocol, source and capability
gates separately from this measured model result.

[Execution ledger](execution-ledger.json) links the representative native
remote oracles and three unique model run IDs.
[pilot-results.json](pilot-results.json) preserves exact metrics, tokens,
original results/trajectory hashes and normalization disclosures. Costs are
runner estimates, not billing, and sample size is one per condition.

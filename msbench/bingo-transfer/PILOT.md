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
additional, genuinely new X01 combined condition is being prepared to test that
mechanism on this different fault family. Its app/prompt/grade will remain
identical and model tool use will not be forced. This is a declared follow-up,
not another raw/skills-only trial or an independent application sample.
No combined result is asserted before its local/remote gates and model run.

[Execution ledger](execution-ledger.json) links the representative native
remote oracle and two model run IDs.
[pilot-results.json](pilot-results.json) preserves exact metrics, tokens,
original results/trajectory hashes and normalization disclosures. Costs are
runner estimates, not billing, and sample size is one per condition.

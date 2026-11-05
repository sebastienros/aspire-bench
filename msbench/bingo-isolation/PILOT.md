# S01 two-real-app Terra pilot

Both original model conditions passed the native cloud grader. Actual model
call events identify `gpt-6.1-terra`; vendor CLI provenance resolves 1.0.99-0.
No repeated condition or model retry was submitted.

| Condition | Native agent seconds | Tool calls | Runner cost USD |
|---|---:|---:|---:|
| Raw scripted | 56.4 | 24 | 0.0631 |
| Aspire + original skills | 68.4 | 29 | 0.0863 |

Both agents repaired the requested app while the separate full Bingo app
remained functional. The independent grade exercised fresh HTTP/SQL/Redis
effects in each app, absence in the other, preserved original data, processes,
containers, credentials/TLS/ACL/config, and unchanged sources. The Aspire agent
loaded monitoring. Neither accessed protected grader/oracle/state paths in
observed tool-start arguments.

This establishes scoped-repair feasibility for two actual application instances
with duplicate logical resource names. It is not proof of two editor-owned
sessions, host-managed git-worktree ownership, cross-host behavior or an
unrelated application domain. Both run in sibling source workspaces under one
private runner. One sample per arm is not a significance result.

The raw observation was faster and cheaper. Retain that result rather than
rerunning it to seek an Aspire win. Stable application/resource/connection
identity remains a correctness requirement, but this pilot shows no measured
correctness advantage for either workflow: both succeeded.

[Execution ledger](execution-ledger.json) links the representative native
remote oracle and two model run IDs.
[pilot-results.json](pilot-results.json) preserves exact metrics, tokens,
result/trajectory hashes, cost estimates and trace normalization disclosures.

# One additional X01 condition: original skills plus MCP

**Status: static preparation only; live MCP/local/remote gates pending.** No
Docker or model run is authorized by this change. The parent owns the sole local
Docker slot decision, independent remote oracle and at most one new low-budget
Terra submission. Do not rerun the original raw or skills-only conditions.

This follow-up asks whether the previously promising D01 **combined skills+MCP
mechanism** transfers to X01's genuinely different ACL-denial fault/name instance.
It is one new mechanism cell on the same task, not a new independent fault
family/application sample and not evidence of superiority before execution.
The original raw and skills-only pilot results are parent-owned and are not
recomputed or rewritten here.

`tasks/skills-mcp` keeps the exact original X01 symptom prompt, namespace,
held-out AppHost resource names, Redis ACL incident, live HTTP500 versus healthy
PING/read behavior, external grader, all 12 negatives, 900/300-second budgets,
4 CPU/8 GiB limits and original seven skills. It changes only MCP availability:
the original `/app/.github/mcp.json` is retained for native discovery, and the
same stdio server is declared for Harbor:

```toml
[[environment.mcp_servers]]
name = "aspire"
transport = "stdio"
command = "aspire"
args = ["agent", "mcp", "--non-interactive", "--nologo"]
```

The Dockerfile inherits original Bingo `d3694ec`, the unchanged original skill
snapshot `1fcca7e`, and the already validated X01 AppHost/runtime archive from
**public immutable `67f2ac195c653009972508203f84900368912fee`**. That is the
parent-published equivalent of this child's `acfec6e`, not a mutable branch or
fork. The existing AppHost and archive were byte-compared with GitHub contents
at that exact revision. It uses only portable Git build contexts, never
outside-environment filesystem grants, package/toolchain upgrades, regenerated
common sources or modified existing archives/receipts.

## Oracle-only live preflight

Before any reference recovery, `solution/mcp-probe.mjs` starts the actual Aspire
13.6 MCP server in `/app` using its normal stdio transport. It must:

1. Initialize successfully and expose the required AppHost/resource/log tools.
2. Discover `/app/apphost.cs` and successfully select that exact AppHost.
3. Return real `cedar83-quill`, `cedar83-ledger`, `steward` and `mosaic` resources.
4. Read `steward` console logs containing the **actual NOPERM** error while the
   seeded failure is still active. Generic Redis/timeout text is insufficient.

It records tool names, response lengths/SHA-256 and verified facts to
`/logs/environment/mcp-preflight-evidence.json`, with server stderr retained
separately in local environment logs. No raw resource/log response or credential
is copied into the compact receipt. It terminates/reaps only its own MCP process.
Timeouts, malformed JSON-RPC, missing tools, wrong AppHost/resources, server errors
and missing NOPERM all fail the oracle preflight explicitly.

This is **oracle-only infrastructure verification**, not forced model behavior:
neither the probe nor oracle solutions enter the agent image. The prompt and
verifier prescribe no MCP calls, no tool order and no agent report. The external
reward remains exclusively the original live functional/data/credential/TLS and
container/process-preservation grade. Installed/configured, advertised, live
reachable, actually called by the model, useful and passing are separate facts;
static mocks establish none of the live ones.

## Static gate and handoff

```bash
node --test msbench/bingo-transfer/experiment.test.mjs \
  msbench/bingo-transfer/skills-mcp.test.mjs \
  msbench/bingo-isolation/experiment.test.mjs
harbor run --path msbench/bingo-transfer/tasks/skills-mcp --agent oracle \
  --n-concurrent 1 --print-config
```

Mock stdio tests exercise initialization, calls, evidence, log retry and failure
handling without launching Aspire or Docker. The existing 19 checks and their
old validated-source/archive hashes remain unchanged and passing. New tests
require exact prompt/verifier/negative equivalence and verify the sole reference
solution difference is the added live preflight.

Only after the parent explicitly grants a local slot may this single new cell's
oracle be run, with all jobs/logs in this child's session files. A direct-Docker
fallback, if specifically authorized, must preserve the same declared limits
and label its evidence honestly; it is not itself a native Harbor/remote pass.
The parent must independently verify a published Git-pinned remote oracle
before the one new model condition. Record actual model/tool use and null or
negative results without retries toward a preferred result.

[Preparation manifest](evidence/skills-mcp.json) separates source/protocol/static
facts from still-pending live availability and model-use evidence. The existing
F14 and paired runtime receipts remain historical records, not this new arm's
success report.

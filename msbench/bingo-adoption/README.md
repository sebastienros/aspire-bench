# A01: adopt Aspire without rewriting Bingo

Cold-start adoption-cost scenario in the [research program](../AGENTIC-RESEARCH.md).
The initial workspace is the unchanged raw Bingo application with useful
scripts/documentation, no AppHost, and no running application. The agent adds
orchestration/configuration, starts through Aspire 13.6.0, and preserves existing
business code. Seven original Aspire skills are available; MCP is disabled.

This is deliberately **an adoption study**, not an artificial raw-versus-Aspire
speed comparison: the raw app already has a working launcher, so pretending
that running it is equivalent to adopting an orchestrator would be misleading.
Measure this as setup cost and feasibility, alongside the paired runtime tasks.

Two unique skill conditions are prepared: `aspire` uses the original pinned
bundle, and `generated-skills` uses actual version-matched CLI-13.6 generation.
Only four generator files differ (router/init and their references). Unlike
the diagnostic task's unchanged monitoring body, this adoption task exercises
the changed init/router intent. App, prompts, oracle, grader and budgets remain
identical; no MCP or extra reporting requirement is added. This is not a second
independent application sample or a rerun of the same condition.

## Independent proof

The grader invokes the installed CLI against the newly created AppHost and
discovers real running admin/frontend resources. It rejects missing orchestration,
changed original source/guidance, reuse of raw fixed application ports, and an
AppHost embedding the supplied password. Fresh HTTP requests independently
exercise login, Vue, version/SignalR proxies, database square import, and
Redis-backed call/status/clear. Direct owned-container checks confirm seeded
PostgreSQL and authenticated Redis readiness. A report file is not evidence;
the grader writes the endpoint artifact after validation.

The oracle proves no-AppHost and unrelated-mutation rejection before final
success. Its minimal AppHost and startup recipe live only under `solution/`,
not inside the model container. Existing business sources remain unchanged:
ServiceDefaults adoption is not required just to orchestrate an existing app.

The allowed new configuration surface means this grader is not an adversarial
sandbox. It validates functional adoption, not every possible best practice or
observability instrumentation quality.

## Evidence

Initial private Docker oracle passed reward 1 without exceptions, with actual
Aspire start/wait/describe and database/Redis behavior:
`.runs/msbench-oracle/bingo-adoption-v1/`. The final oracle after tightening
port/secret checks was interrupted by a shared-host storage/Docker failure.
**The final task is not runtime-validated and is not eligible for model submission.**
The first pass must not be relabeled as validation of later grader changes.
Focused task tests:

```bash
node --test msbench/bingo-adoption/experiment.test.mjs
harbor run --path msbench/bingo-adoption/tasks/aspire --agent oracle \
  --jobs-dir .runs/msbench-oracle --job-name bingo-adoption-validation --n-concurrent 1
```

No model execution has been submitted. After owner-controlled Docker/storage
recovery, validate the final image/oracle sequentially, then publish an immutable
source pin and run at most one new Terra pilot with its condition fingerprint.
Do not compare this cold adoption task's elapsed time to warm I01 repair times.

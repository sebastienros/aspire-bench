# D01 diagnostic skill/MCP treatments

Prospective, version-matched mechanism comparison. No cell is eligible for
model submission until its image/runtime gate and capability checks pass.
These are static Harbor tasks, not Vally conversion or dynamic benchmark
rewriting. They retain the same seed-47 fault, source, prompt, oracle, grader,
budgets and ordinary shell access.

| Cell | Skills | MCP | Purpose |
|---|---|---|---|
| `cli` | None | Off | Aspire CLI baseline |
| `aspire` | Seven pinned original skills | Off | Existing D01 product arm; reuse its first model result, do not resubmit |
| `mcp` | None | On | Natural tool choice with MCP available |
| `skills-mcp` | Seven pinned original skills | On | Combined factorial cell |
| `generated-skills` | Seven actually generated CLI-13.6 skills | Off | Project-local generator treatment |
| `focused-trigger` | Same original skills; only monitoring description changed | Off | Isolate discovery specificity from recipe content |

The raw-scripted D01 arm is the product control, not a factorial cell. All
cells permit CLI/Bash use; none forces MCP. Analyze installed, advertised,
reachable, called and useful separately. An unused MCP installation is not
evidence of transport benefit or lack of capability.

## Version-matched generation

The task-local native CLI is
`13.6.0+56f3e9c0d216c0c7069dabb49dd0464e4827744f`, not the globally installed
17-preview used by the earlier availability-only preflight. The matching
generation command:

```bash
aspire agent init --workspace-root <scratch> --skill-locations github \
  --skills aspire,aspire-init,aspireify,aspire-orchestration,aspire-deployment,aspire-monitoring,aspire-project-v2-migration \
  --mcp=false --non-interactive --nologo
```

It installed seven skills in `.github/skills`. Only the generated skill
directory is copied into the treatment; generated telemetry hooks are not.
The original license is retained. Compared with the old pinned bundle, only
four files differ: router, router breaking-change reference, init, and init
workflow reference. The monitoring body is unchanged. This compares actual
generator output, not a presumed app-specific resource recipe.

CLI 13.6's `agent mcp` does **not** accept the host-17 `--apphost` option;
the cells use its actual supported command and the one-AppHost private workspace.
Declarative Harbor server configuration and Copilot-native MCP configuration
are both present in enabled cells, and absent in disabled cells.
The version-matched native MCP process actually completed `initialize` and
`tools/list` with 14 tools, including `list_apphosts` and `select_apphost`;
the earlier host-17 check's 13-tool shape is not silently reused. This still
does not prove the private Docker resource backchannel or agent use.

An initial finite-input client closed stdin before the server could flush its
reply; the persistent event-driven client succeeded. Keep this transport
probe separate from task/model failures.

## Metadata-only trigger

`focused-trigger` retains the monitoring skill name, folder, all references,
license, metadata and complete body. Only its discovery description is narrowed
to already-running local failed operations. No app-specific recipe, reporting
script, resource map or special probe is added. This isolates the metadata
factor missing from earlier specific-recipe comparisons.

## Execution limits

One original Terra attempt per new unique condition, initially. The skills-only
arm's first D01 result is shared by the product and mechanism reports; never
count it twice as an independent sample. No duplicate I01/startup/health runs.
Single samples are mechanism-feasibility evidence, not statistical proof.

Local Docker work is serialized after recovery; inspect actual MCP schemas/
backchannel and skill advertisement before inference. The original model/client
pins and exact input/condition fingerprints must be recorded with each run.

MCP-enabled reference oracles additionally run an oracle-only transport/
backchannel/log probe against the actual incident before the unchanged repair
recipe. It is not copied into model images, does not require a model to use MCP,
and its time is not agent performance evidence.

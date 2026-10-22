# Aspire improvement findings

Record actionable lessons from the benchmarks here, including negative results.
This is the cross-experiment register; individual experiment READMEs retain
full run tables, reproduction commands, and measurement definitions.

Distinguish observed behavior from proposed improvements. A benchmark finding
is not an upstream fix, a general performance guarantee, or proof of causation.
Update an existing entry when new evidence strengthens or contradicts it.

## F01: A directly discoverable startup skill avoids repository discovery

**Evidence:** In the [recipe-location comparison](aspire-startup/README.md#observed-recipe-location-results),
the same recipe appeared either in the README or in one `aspire-startup`
skill, with identical location-neutral prompts and no MCP. All three
model-executed skill trials loaded the skill first and immediately ran the
recipe; README trials searched the workspace and inspected AppHost/config files.
All six executed trials passed.

Median pre-launch time was 8.9 seconds for the skill versus 14.3 seconds
for README-only; outside-recipe time was 14.9 versus 23.0 seconds.
Total medians were 72.4 versus 86.3 seconds.

**Improvement candidate:** Expose a clearly named, self-contained startup
workflow with a precise trigger. Avoid requiring a router, broad repository
inspection, or multiple reference reads when the AppHost and task are known.

**Limits / status:** Promising, not adopted upstream. Three valid samples
per arm; two skill trials were infrastructure replacements. Readiness waits
also differed. The total-time difference is not a causal estimate of skill
benefit. This was application-specific guidance with explicit readiness and
endpoint commands, not proof that `aspire run` alone satisfies the task.

## F02: Shorter guidance is not automatically faster end-to-end

**Evidence:** The [compact-skill comparison](aspire-startup/README.md#observed-compact-skill-results)
replaced seven skills with one short skill pointing to the same README.
Median outside-recipe time fell from 21.9 to 19.5 seconds, but full agent
time did not improve: 83.7 versus 85.2 seconds. All six executed trials passed.
The [four-cell ablation](aspire-startup/README.md#observed-startup-results)
also showed similar median launch-command times across capability treatments
(18.8-20.0 seconds) despite different discovery overhead.

**Improvement candidate:** Optimize unnecessary decisions and reference
transitions, not merely word count. Measure pre-launch discovery separately
from application launch, readiness waiting, and reporting.

**Limits / status:** Observed negative result. Small samples and actual skill
consumption varied. A shorter startup-only skill does not replace the broader
capabilities or safety requirements of general-purpose Aspire skills.

## F03: Endpoint discovery needs an accurate, isolation-safe contract

**Evidence:** The original Aspire trajectories incurred endpoint-name and
schema mistakes and substantial post-readiness work. The
[startup ablation recipe](aspire-startup/README.md#measurement) matches
`resources[].displayName` rather than isolation-suffixed resource `name`,
and reads `urls[].url`, not `endpoints[]`. With that recipe, extraction took
0.15-0.26 seconds in the four-cell ablation.

**Improvement candidate:** Put a concise, tested endpoint-discovery example
next to startup instructions. Consider a directly consumable CLI/MCP endpoint
summary that avoids resource-name and schema inference.

**Limits / status:** Recipe validated in this benchmark; product/API change
only proposed. Historical startup medians cannot isolate the recipe's effect
because task scope and prompts also changed. Command/wait completion does not
measure the earliest possible HTTP readiness.

## F04: Capability installation and actual usage must be verified separately

**Evidence:** Original cloud runs did not consume the supplied skills until
they were also installed in Copilot's native `.github/skills` location, in
addition to Harbor's declared skill root. Later trajectories confirmed real
skill loading. See [original benchmark evidence](README.md).
In the four-cell startup ablation, MCP-only trials made no Aspire MCP calls;
only one combined-treatment trial called `list_apphosts`. All six
skill-enabled ablation trials loaded orchestration guidance.

**Improvement candidate:** Validate client-native skill discovery and MCP
configuration, then inspect actual tool calls before attributing outcomes to
those capabilities. For an MCP usability experiment, choose a task that
requires its functionality rather than forcing irrelevant calls.

**Limits / status:** Installation fix implemented in benchmark images.
Availability is not consumption; no startup MCP speed benefit was established.
The shared app contains MCP configuration, so no-MCP images must explicitly
remove it to avoid treatment contamination.

## F05: Multi-step session continuity is a runner contract, not workspace reuse

**Evidence:** The [Copilot continuation probe](aspire-startup/README.md#continuation-retry-with-msbench-0367)
exited before model actions and later invocations refused execution because
of a retained runner lock. The [Codex control](aspire-startup/README.md#alternative-agent-continuation-control)
passed all four steps in both modes but created four distinct threads even
with resume enabled. Its packaged runner invoked `codex exec` without
reloading conversation history.

**Improvement candidate:** Until a runner demonstrably reloads its session,
make skills/MCP workflows usable from a fresh conversation against an already
running application. Once supported, evaluate whether retained context avoids
repeated discovery and health-assessment work.

**Limits / status:** Genuine continuation comparison remains blocked.
Not evidence of an Aspire defect or a definitively identified submission-CLI
bug. The initial Copilot exit remains unexplained.
Reported on [devdiv-microsoft/msbench#2020](https://github.com/devdiv-microsoft/msbench/issues/2020#issuecomment-6326811393).

## F06: Setup failures must not become model or Aspire failures

**Evidence:** Experiments encountered a missing Copilot platform package
during agent setup and HTTP 503/504 responses fetching the Aspire installer
during Docker builds. These attempts never reached model execution.
Experiment READMEs retain failed run links and explicitly labeled replacements.

**Improvement candidate:** Track image-build and agent-setup reliability
separately from task correctness and startup latency. Consider bounded
installer-download retries or prevalidated build artifacts as an independent
infrastructure improvement, without silently changing comparison treatments.

**Limits / status:** Failures classified and retained; infrastructure hardening
is not implemented by this finding. These events do not establish an Aspire
runtime or model-reasoning failure.

## F07: Broader skill availability need not add startup discovery churn

**Evidence:** The [orchestration-availability comparison](aspire-startup/README.md#observed-orchestration-availability-results)
added the full, unchanged orchestration skill alongside the self-contained
startup skill, with everything else matched and no router/MCP. Raw model
prompt logs confirmed both skills were advertised. All three combined
trials selected only `aspire-startup`, just like the three valid controls.
Each trial made exactly one pre-launch tool call (the skill load), with
zero orchestration-reference reads. All six executed trials passed.

Median pre-launch time was 8.3 seconds combined versus 8.8 seconds startup-only;
outside-recipe time was 14.9 versus 15.1 seconds. Full medians were 78.8
versus 75.0 seconds, with variable readiness waits.

**Improvement candidate:** Keep a narrow, directly discoverable entry point
for known startup work while retaining broad orchestration guidance for
cases that need it. Investigate routing/trigger behavior before removing
the broader skill on the assumption that its mere presence adds churn.

**Limits / status:** Negative availability-overhead result, not proof of zero
cost. Three samples per arm, including one control infrastructure replacement.
The orchestration body was never loaded, so this does not measure the cost
of its invocation or negate discovery overhead observed in other skill-bundle
experiments. Any forced-invocation test must be reported separately.

**Full-bundle follow-up:** The
[complete predefined bundle comparison](aspire-startup/README.md#observed-full-bundle-results)
advertised all seven original skills plus startup in every full-bundle
trial. Again, all three trials selected only `aspire-startup`, with no
router/orchestration load, one pre-launch tool call, and zero reference
reads, matching the three startup-only controls. All six original
submissions executed and passed without replacements.

Pre-launch medians were 8.5 seconds full-bundle versus 9.0 seconds control;
outside-recipe medians were 16.3 versus 15.2 seconds. Total medians were
85.3 versus 71.1 seconds, alongside readiness-wait medians of 48.4 versus
35.2 seconds. Do not turn the absence of routing churn into a claim of zero
overall cost, or attribute readiness variation to the bundle from three
samples.

**Adoption direction:** An additive startup entry point is supported as a
candidate; neither orchestration nor the router needs to be removed to
enable direct selection in this scenario. Retain all existing skill content
until a generalized startup skill and broader routing/safety tests establish
what overlap can be removed. The measured skill hardcodes Bingo paths,
resource names, and timing artifacts, so it is not yet a drop-in upstream
skill. Startup success alone does not validate editor ownership, ambiguous
targets, worktree isolation across hosts, or stop/restart behavior.

## Recording future findings

Give each finding a stable ID and include evidence links, exact observed
behavior or metrics, an actionable improvement candidate, limits, and status.
Keep negative/null results and contradictory evidence. Identify infrastructure
replacements, distinguish capability availability from actual use, and do not
pool experiments with different prompts or guidance. When an improvement is
implemented or reported upstream, link it and retain the original evidence.

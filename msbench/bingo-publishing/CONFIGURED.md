# Preconfigured production comparison

**Both native local production oracles pass; no new model runs.**
This is a new prospective fixture, not a regrade of the original P01 model runs.
The original P01 AppHost required the model to add the deployment target,
frontend and configuration. That compared wiring plus deployment against raw
Compose authoring, not operating two already configured applications. Its
144.4/324.5-second measurements cannot isolate deployment efficiency from
that preparation work.

For this corrected comparison, both arms already contain their complete
production deployment models and the same documented command,
`bash deployment/deploy.sh`. Aspire has both `AddDockerfile` resources,
`AddDockerComposeEnvironment`, `WithDashboard(false)`, external networking,
matching local image tags and production parameters before the agent starts.
Raw has the corresponding complete production Compose model. Neither model
has to author or repair those configurations.

The `raw-configured` and `aspire-configured` prompts are byte-identical and
outcome-oriented: deploy the application, verify its real behavior and preserve
existing state. They prescribe no Aspire APIs, traces or tool order.
Only `deployment/` runtime artifacts are editable. The original AppHost/raw
Compose model is protected by the same input snapshot used for business code.
Both still start without deployed application containers; normal image build,
publication and deployment work occurs during the task, not in fixture setup.

The application, production Dockerfiles, ports, supplied dependencies/data,
900/300-second budgets and independent functional contract remain the same.
For deployment, the oracle only invokes the supplied command; it does not author
or substitute a deployment model. Its deliberate model-edit negative is restored
before deployment. In addition to the existing functional/negative cases,
it must reject an edited supplied model and prove its SHA-256 remains unchanged
after deployment and repeated negative-case restoration.

Historical tasks, dataset pins, model sources, native scores and measurements
are preserved. The new grader flag applies only to these configured variants;
legacy P01 still permits editing the AppHost. No new model run is requested
or submitted as part of preparing this correction. A future cloud model experiment
still requires an independent native remote oracle and prospective condition
records.

## Actual local gate

Both new public-Git task images were force-built and run sequentially with
native Harbor 0.20.0, `--agent oracle --n-concurrent 1 --force-build`.
Raw job `p01-raw-preconfigured-v1` and Aspire job
`p01-aspire-preconfigured-v1` each returned reward 1 with no exception.
The common source pin is `8255977f24d4bf0ff272ed72b3205f81d66d7367`;
the original business-source pin remains unchanged.

Both verified actual Production .NET/nginx, correct/wrong login, static Vue,
SignalR/database catalog, fresh Redis boards and preservation of supplied data,
dependencies, network and volume. Six raw and eight Aspire negative cases
were rejected, including editing the preconfigured model. The supplied model's
SHA-256 survives deployment and the negative suite unchanged; the existing
input snapshot independently enforces that preservation.

These are Linux ARM64 local fixture proofs, not model-performance samples.
The native wrapper uses the declared 4 CPU/8 GiB and 900/300-second limits;
the live Aspire runner's CPU/memory limits were also inspected. Harbor removed
both owned runners. Other users' Docker workloads were left untouched.
The exact task/result/output/artifact hashes are recorded in
`configured-evidence.json`; large native jobs remain in persistent session files.

---
name: aspire-health
description: Verify readiness and health of already-running Aspire services or resources, including databases and Redis, using the Aspire CLI resource health table. Use for service health, database readiness, or cache health assessments after startup. Do not use for starting, restarting, provisioning, deployment, or detailed protocol/schema validation.
---

# Observe Aspire resource health

Use the existing application's known AppHost path from the supplied guidance.
Do not start or restart anything. Inspect current resource state and health:

```bash
aspire describe --apphost <apphost-path> --format table --non-interactive --nologo
```

For a known resource, scope the same observation:

```bash
aspire describe <resource-name> --apphost <apphost-path> --format table --non-interactive --nologo
```

Read the table's Name, Type, State, and Health columns. Use the names returned
by Aspire, not guessed Docker names or ports. Identify the requested resource
from the table and supplied guidance; if its integration is unclear, read
only the relevant AppHost declaration. Ask rather than guess if ambiguous.
A single all-resource table can satisfy an assessment; do not repeat scoped
queries merely to duplicate already sufficient evidence.

For long-running services, a successful assessment requires the relevant rows
to be present with State `Running` and Health `Healthy`. Finished installer
or migration jobs are not failed long-running services. Missing, unhealthy,
or unreported health is not proof of readiness. If still becoming ready, use
`aspire wait <resource-name> --apphost <apphost-path> --non-interactive --timeout 120 --nologo`,
then describe again. Bound retries; report actual failures instead of repairing
or recreating resources.

Write the report filename and boolean fields requested by the prompt, with
evidence naming the observed resource rows, states, and health. Preserve prior
reports and endpoint files. A successful CLI exit alone does not mean healthy:
inspect the relevant rows before reporting success.

Describe this as Aspire-reported health, not an independent HTTP, SQL, seed-data,
or authenticated Redis probe. For these resource-health assessment prompts, do
not add those type-specific probes, inspect container credentials, or load other
skills unless the user explicitly requests deeper checks. Preserve supplied
environment values, application sources, and guidance; the harness owns cleanup.

---
name: aspire-service-health
description: Verify the already-running Bingo application's services are running and healthy, using its saved HTTP endpoints, and record the observed service assessment. Use for service health verification after startup, not starting, restarting, deployment, database readiness, or Redis checks.
---

# Observe existing service health

Work in `/app`. Read `benchmark-endpoints.json`; do not rediscover or
overwrite its allocated URLs. Check the admin login, player page, and proxied
API with real HTTP requests:

```bash
set -euo pipefail
cd /app
node --input-type=module <<'JS'
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const urls = JSON.parse(readFileSync("benchmark-endpoints.json", "utf8"));
for (const url of [`${urls.admin}/login`, `${urls.frontend}/`, `${urls.frontend}/api/version-info`]) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
}
writeFileSync("benchmark-services-health.json", JSON.stringify({
    running: true, healthy: true,
    evidence: "Admin login, player frontend and frontend API returned HTTP 200.",
}));
JS
```

Do not infer success from previous steps. If a check fails, report the actual
failure, inspect the existing resource's logs if needed, and use bounded
retries for transient readiness. Do not emit a successful assessment unless
all checks pass. Do not start, restart, recreate, or modify resources, source,
guidance, or prior benchmark JSON files. Preserve supplied environment values;
the harness owns cleanup.

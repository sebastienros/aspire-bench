# Running Bingo workspace

The application is already running. `benchmark-endpoints.json` records its
player and admin origins. The producer API on the admin origin provides
`POST /api/demo/producer/squares/import` (JSON array of id/label/type/isActive),
`POST /api/demo/producer/squares/{id}/state/true` (or `false`), and
`GET /api/demo/producer/status`. The player uses the existing SignalR hub.

Use the repository's normal workflow and runtime observations. For the raw
workflow, `bash scripts/check.sh`, `.script-state/admin.log`,
`.script-state/frontend.log`, and `docker compose ps/logs` provide checks and
logs; `compose.yaml` defines dependency ownership and published ports.
For an Aspire workspace, the AppHost and installed general skills describe
the supported workflow, including resource state and console logs.
Tools need not be used in any particular order.

This Docker daemon also contains a small, unrelated workload. Do not repair,
restart or reset it. Identify ownership from the running app's connection
configuration and resource metadata rather than guessing from similar names.
Keep existing data, source/configuration, processes and endpoint metadata.
Fix runtime state in place; do not restart the whole application.

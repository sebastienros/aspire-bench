#!/usr/bin/env bash
set -euo pipefail
cd /app
bash scripts/start.sh
printf '{"admin":"http://localhost:%s","frontend":"http://localhost:%s"}\n' \
    "$ADMIN_PORT" "$FRONTEND_PORT" >benchmark-endpoints.json

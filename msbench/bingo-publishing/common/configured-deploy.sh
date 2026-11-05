#!/usr/bin/env bash
set -euo pipefail
cd /app
source deployment-inputs.env
case "$BENCH_APP_KIND" in
    aspire)
        aspire do prepare-compose --apphost /app/apphost.cs \
            --output-path /app/deployment --non-interactive
        docker compose -p p01-deploy -f deployment/docker-compose.yaml \
            --env-file deployment/.env.Production up -d
        ;;
    raw-scripted)
        cp compose.production.yaml deployment/docker-compose.yaml
        docker compose -p p01-deploy -f deployment/docker-compose.yaml up -d --build
        ;;
    *)
        echo "Unsupported deployment kind: $BENCH_APP_KIND" >&2
        exit 1
        ;;
esac

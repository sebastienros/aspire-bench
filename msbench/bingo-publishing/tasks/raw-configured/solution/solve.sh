#!/usr/bin/env bash
set -euo pipefail
cd /app
if node /opt/benchmark/grade.mjs verify --runtime-only >/tmp/p01-noop.log 2>&1; then
    echo "Grader incorrectly accepted no deployment" >&2
    exit 1
fi
grep -q "Exactly two published deployment services required" /tmp/p01-noop.log
echo "Rejected no-op deployment"
if [[ "$BENCH_APP_KIND" == aspire ]]; then
    model=apphost.cs
    source deployment-inputs.env
    aspire publish --apphost /app/apphost.cs --output-path /app/deployment --non-interactive
    if node /opt/benchmark/grade.mjs verify --runtime-only >/tmp/p01-publish-only.log 2>&1; then
        echo "Grader incorrectly accepted publish-only artifacts" >&2
        exit 1
    fi
    grep -q "Exactly two published deployment services required" /tmp/p01-publish-only.log
    echo "Rejected publish-only artifacts without deployment"
else
    model=compose.production.yaml
fi
cp "$model" /tmp/p01-original-model
printf '\n' >>"$model"
if node /opt/benchmark/grade.mjs verify --runtime-only >/tmp/p01-model-edit.log 2>&1; then
    echo "Grader incorrectly accepted editing the supplied deployment model" >&2
    exit 1
fi
grep -q "Immutable owned inputs changed" /tmp/p01-model-edit.log
cp /tmp/p01-original-model "$model"
echo "Rejected editing the supplied deployment model"
model_hash=$(sha256sum "$model")
bash deployment/deploy.sh
for attempt in {1..60}; do
    if curl -fsS http://127.0.0.1:18081/api/version-info >/dev/null; then break; fi
    sleep 1
done
[[ "$(sha256sum "$model")" == "$model_hash" ]]
node /opt/benchmark/grade.mjs verify
bash /opt/benchmark/negative.sh
[[ "$(sha256sum "$model")" == "$model_hash" ]]

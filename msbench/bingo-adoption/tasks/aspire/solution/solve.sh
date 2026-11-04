#!/usr/bin/env bash
set -euo pipefail
cd /app
if node /opt/benchmark/adoption.mjs verify >/tmp/no-adoption.log 2>&1; then
    echo "Grader accepted an application with no AppHost" >&2
    exit 1
fi
cp "$(dirname "$0")/apphost.cs" /app/apphost.cs
cp "$(dirname "$0")/aspire.config.json" /app/aspire.config.json
bash "$(dirname "$0")/start.sh"
node /opt/benchmark/adoption.mjs verify
cp README.md /tmp/adoption-readme
printf '\nUnrelated mutation\n' >> README.md
if node /opt/benchmark/adoption.mjs verify >/tmp/mutated-adoption.log 2>&1; then
    echo "Grader accepted an unrelated application/guidance change" >&2
    exit 1
fi
grep -q "Existing application or supplied guidance changed" /tmp/mutated-adoption.log
cp /tmp/adoption-readme README.md
node /opt/benchmark/adoption.mjs verify

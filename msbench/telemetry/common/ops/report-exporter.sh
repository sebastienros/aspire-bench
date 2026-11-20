#!/usr/bin/env bash
# Attendance report exporter for the Bingo cache.
#
# Keeps a running total of the size of every live player session stored in the cache so
# the operations dashboard can plot attendance. Started by host provisioning; runs until
# stopped and reconnects if the cache goes away.
# Usage: report-exporter.sh <cache-container>
set -u
container="$1"
query="local total = 0 for _, key in ipairs(redis.call('KEYS', ARGV[1])) do total = total + redis.call('STRLEN', key) end return total"
child=""
trap 'kill "$child" 2>/dev/null; exit 0' TERM INT
trap 'kill "$child" 2>/dev/null' EXIT
resolve() {
    # The cache's plain-text container port is the redis-server --port argument (6380 on Aspire
    # dailies before 2026-11-20, 6379 after microsoft/aspire#22350; the other one is TLS). Aspire
    # publishes it on this host, and the cache may require a password.
    plain="$(docker inspect -f '{{join .Args " "}}' "$container" 2>/dev/null | sed -n 's/.* --port \([0-9]*\).*/\1/p')"
    port="$(docker port "$container" "${plain:-6379}/tcp" 2>/dev/null | head -1 | sed 's/.*://')"
    [ -n "$port" ] || port="$(docker port "$container" 6379/tcp 2>/dev/null | head -1 | sed 's/.*://')"
    password="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container" 2>/dev/null | sed -n 's/^REDIS_PASSWORD=//p')"
}
port=""
while true; do
    if [ -z "$port" ]; then resolve; fi
    if [ -z "$port" ]; then sleep 1; continue; fi
    # One connection, identified to the cache, refreshing the total as fast as it can.
    { printf '%s\n' "CLIENT SETNAME report-exporter"
      while :; do printf '%s\n' "EVAL \"$query\" 0 report:session:*"; done; } |
        env ${password:+REDISCLI_AUTH="$password"} redis-cli --no-auth-warning -h 127.0.0.1 -p "$port" >/dev/null 2>&1 &
    child=$!
    wait "$child" || true
    port=""
    sleep 1
done

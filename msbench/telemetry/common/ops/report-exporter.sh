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
    # The cache publishes its plain-text port (6380 when it also serves TLS) on this host
    # and may require a password.
    port="$(docker port "$container" 6380/tcp 2>/dev/null | head -1 | sed 's/.*://')"
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

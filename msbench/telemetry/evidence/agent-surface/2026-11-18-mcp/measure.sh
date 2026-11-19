#!/bin/bash
# Runs inside one started Bingo cell (slow-sql, live traffic), from /app: each source-built CLI's MCP
# server (`aspire agent mcp`) answers tools/list and the same tool calls back to back (tools/mcp-probe.mjs).
# Output: /tmp/p2mcp/<cli>.txt, the probe's full print (tool list with each schema's bytes, then each call's
# result size and its first 100,000 characters).
set -u
out=/tmp/p2mcp; mkdir -p $out
calls='[
 ["list_resources", {}],
 ["list_resources", {"details": true}],
 ["list_resources", {"resourceName": "cache"}],
 ["list_resources", {"resourceName": "cache", "details": true}],
 ["list_console_logs", {"resourceName": "boardadmin"}],
 ["list_console_logs", {"resourceName": "boardadmin", "severity": "Error"}],
 ["list_console_logs", {"resourceName": "boardadmin", "severity": "Warning"}],
 ["list_console_logs", {"resourceName": "boardadmin", "limit": 2000}],
 ["list_console_logs", {"resourceName": "postgres"}],
 ["list_console_logs", {"resourceName": "postgres", "severity": "Error"}],
 ["list_console_logs", {"resourceName": "cache"}],
 ["list_console_logs", {"resourceName": "cache", "severity": "Error"}],
 ["list_console_logs", {"resourceName": "bingoboard"}],
 ["list_traces", {}],
 ["list_structured_logs", {}],
 ["list_apphosts", {}]
]'
for k in "$@"; do
  PATH="/usr/local/p2mcp/$k:$PATH" node /opt/mcp-probe.mjs "$calls" 100000 >"$out/$k.txt" 2>"$out/$k.stderr"
  echo "$k: $(head -1 $out/$k.txt)"
  grep '^=== ' "$out/$k.txt"
done

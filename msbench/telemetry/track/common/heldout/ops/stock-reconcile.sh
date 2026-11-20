#!/usr/bin/env bash
# Stock reconciliation for the shop database.
#
# Applies the supplier's stock counts in one transaction. It takes the same inventory lock as
# the order worker so that no allocation runs against half-applied counts, then reads the
# counts (one UPDATE statement per line) from the supplier feed and commits once the feed
# closes. Started by host provisioning.
# Usage: stock-reconcile.sh <sql-server-container> [database]
set -u
container="$1"
database="${2:-shopdb}"
feed=/var/lib/shop-ops/supplier-feed
mkdir -p "$(dirname "$feed")"
[ -p "$feed" ] || mkfifo "$feed"
password="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container" | sed -n 's/^MSSQL_SA_PASSWORD=//p')"
{
    printf '%s\n' "SET NOCOUNT ON;" "BEGIN TRANSACTION;" \
        "EXEC sp_getapplock @Resource = N'inventory', @LockMode = N'Exclusive', @LockOwner = N'Transaction', @LockTimeout = -1;" \
        "GO"
    cat "$feed"
    printf '%s\n' "COMMIT;" "GO"
} | docker exec -i -e SQLCMDPASSWORD="$password" "$container" \
    /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -d "$database" -b

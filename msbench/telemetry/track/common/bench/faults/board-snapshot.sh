#!/usr/bin/env bash
# Board snapshot: freezes the squares table so the snapshot is consistent, then waits until the
# upload of the snapshot has finished before releasing it.
#   board-snapshot.sh <postgres-container>
set -u
container="$1"
done_marker=/var/run/bingo-ops/board-snapshot.uploaded
mkdir -p /var/run/bingo-ops
{
    echo 'BEGIN;'
    echo 'LOCK TABLE "BingoSquares" IN ACCESS EXCLUSIVE MODE;'
    echo '\echo board-snapshot: squares frozen'
    until [ -e "$done_marker" ]; do sleep 5; done
    echo 'COMMIT;'
} | docker exec -i "$container" sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U postgres -d db -v ON_ERROR_STOP=1'

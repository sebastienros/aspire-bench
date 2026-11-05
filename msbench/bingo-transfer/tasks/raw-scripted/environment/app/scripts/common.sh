#!/usr/bin/env bash
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/base-common.sh"

postgres_ready() {
    compose exec -T ledger pg_isready -U postgres -d bingo >/dev/null 2>&1
}

redis_ready() {
    local reply
    reply="$(compose exec -T quill redis-cli ping)" && [[ "$reply" == "PONG" ]]
}

database_seeded() {
    local result
    result="$(compose exec -T ledger psql -U postgres -d bingo -At -v ON_ERROR_STOP=1 -c \
        'SELECT EXISTS (SELECT 1 FROM "AspNetUsers" WHERE "UserName" = '\''admin'\'') AND EXISTS (SELECT 1 FROM "BingoSquares");')" &&
        [[ "$result" == "t" ]]
}

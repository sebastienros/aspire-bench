#!/bin/sh
# Benchmark shim, cold-start arms with a source-built CLI only (installed by entrypoint.sh).
# A source build has no DCP/dashboard bundle; the AppHost build reads AspireCliBundlePath instead.
if [ -z "${AspireCliBundlePath:-}" ]; then
    layout="$(ls -d /usr/local/versions/*/ 2>/dev/null | head -n 1)"
    if [ -z "$layout" ]; then
        /usr/local/aspire/aspire setup >/dev/null 2>&1 || true
        layout="$(ls -d /usr/local/versions/*/ 2>/dev/null | head -n 1)"
    fi
    [ -n "$layout" ] && export AspireCliBundlePath="${layout%/}"
fi
exec /usr/local/aspire-source/aspire "$@"

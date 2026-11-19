#!/bin/sh
# Materializes a named skill set into a destination directory.
#   current  the eight skills shipped by microsoft/aspire-skills v0.0.6, unchanged
#   plus     current + the new aspire-diagnose skill (purely additive)
#   lean     plus, without the `aspire` router, and with aspire-monitoring's trigger
#            description narrowed so first-line diagnosis routes to aspire-diagnose
#   lean-start  lean + the new aspire-start skill
#   mon      current, with only aspire-monitoring's description replaced by lean's (PLAN T1.2)
#   norouter current without the `aspire` router, nothing added (PLAN T1.3; T3.8's bundle-minus)
#   lean-noorch  lean without aspire-orchestration; the start job moves to AGENTS.md v2 (PLAN T2.11)
#   lean-connect lean with aspire-diagnose step 3 reduced to describe's `connect` block (PLAN T2.6)
#   lean-spanrow lean with one span-table row: many slow client spans to one dependency (PLAN T2.5 follow-up)
#   lean-start-wait  lean + aspire-start rewritten to one `aspire start --wait` (PLAN T2.2, patched CLI)
#   lean-tracetable  lean with aspire-diagnose step 2 reading the trace tree, not JSON (PLAN T2.3, patched CLI)
#   lean-mcpstep  lean with aspire-diagnose step 3 telling MCP users to leave MCP for the dependency (PLAN T2.8)
#   current-mcpstep  current with an aspire-monitoring step 6 (leave MCP, confirm at the dependency) and a router line to it (PLAN T2.8)
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
set_name="$1"; dest="$2"
mkdir -p "$dest"
case "$set_name" in
    current) cp -R "$here/current/." "$dest/" ;;
    plus)    cp -R "$here/current/." "$dest/"; cp -R "$here/new/." "$dest/" ;;
    lean)    cp -R "$here/current/." "$dest/"; cp -R "$here/new/." "$dest/"
             rm -rf "$dest/aspire"
             cp -R "$here/lean-overrides/." "$dest/" ;;
    lean-start) cp -R "$here/current/." "$dest/"; cp -R "$here/new/." "$dest/"; cp -R "$here/start/." "$dest/"
             rm -rf "$dest/aspire"
             cp -R "$here/lean-overrides/." "$dest/" ;;
    mon)     cp -R "$here/current/." "$dest/"; cp -R "$here/lean-overrides/." "$dest/" ;;
    norouter) cp -R "$here/current/." "$dest/"; rm -rf "$dest/aspire" ;;
    lean-noorch) cp -R "$here/current/." "$dest/"; cp -R "$here/new/." "$dest/"
             rm -rf "$dest/aspire" "$dest/aspire-orchestration"
             cp -R "$here/lean-overrides/." "$dest/" ;;
    lean-start-wait) cp -R "$here/current/." "$dest/"; cp -R "$here/new/." "$dest/"; cp -R "$here/start-wait/." "$dest/"
             rm -rf "$dest/aspire"
             cp -R "$here/lean-overrides/." "$dest/" ;;
    lean-tracetable) cp -R "$here/current/." "$dest/"; cp -R "$here/new/." "$dest/"
             rm -rf "$dest/aspire"
             cp -R "$here/lean-overrides/." "$dest/"; cp -R "$here/diagnose-table/." "$dest/" ;;
    lean-mcpstep) cp -R "$here/current/." "$dest/"; cp -R "$here/new/." "$dest/"
             rm -rf "$dest/aspire"
             cp -R "$here/lean-overrides/." "$dest/"; cp -R "$here/mcp-step/." "$dest/" ;;
    current-mcpstep) cp -R "$here/current/." "$dest/"; cp -R "$here/mcp-step-shipped/." "$dest/" ;;
    lean-connect) cp -R "$here/current/." "$dest/"; cp -R "$here/new/." "$dest/"
             rm -rf "$dest/aspire"
             cp -R "$here/lean-overrides/." "$dest/"; cp -R "$here/connect-overrides/." "$dest/" ;;
    lean-spanrow) cp -R "$here/current/." "$dest/"; cp -R "$here/new/." "$dest/"
             rm -rf "$dest/aspire"
             cp -R "$here/lean-overrides/." "$dest/"; cp -R "$here/spanrow-overrides/." "$dest/" ;;
    *) echo "Unknown skill set: $set_name" >&2; exit 1 ;;
esac
rm -f "$dest/LICENSE"
ls "$dest"

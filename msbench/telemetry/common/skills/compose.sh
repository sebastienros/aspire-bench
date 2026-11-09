#!/bin/sh
# Materializes a named skill set into a destination directory.
#   current  the eight skills shipped by microsoft/aspire-skills v0.0.5, unchanged
#   plus     current + the new aspire-diagnose skill (purely additive)
#   lean     plus, without the `aspire` router, and with aspire-monitoring's trigger
#            description narrowed so first-line diagnosis routes to aspire-diagnose
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
    *) echo "Unknown skill set: $set_name" >&2; exit 1 ;;
esac
rm -f "$dest/LICENSE"
ls "$dest"

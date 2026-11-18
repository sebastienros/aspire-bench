#!/bin/bash
# Runs inside the cell container, from /app, stdout redirected to a file (not a TTY).
cd /app
out=/tmp/t15; mkdir -p $out
declare -A BIN=([official]=/usr/local/aspire/aspire [control]=/usr/local/aspire-control/aspire [patched]=/usr/local/aspire-source/aspire)
cmds=("describe" "describe --format Json" "otel traces -n 15 --search duration:>500" "otel traces" "otel spans -n 20" "otel logs -n 20")
slug(){ echo "$1" | tr ' :>' '-__' | tr -s '-'; }
for c in "${cmds[@]}"; do
  for k in official control patched; do
    f="$out/$k-$(slug "$c")"
    ${BIN[$k]} $c >"$f.stdout" 2>"$f.stderr"
    echo -e "$c\t$k\texit=$?\tstdout=$(wc -c <"$f.stdout")\tstderr=$(wc -c <"$f.stderr")"
  done
done

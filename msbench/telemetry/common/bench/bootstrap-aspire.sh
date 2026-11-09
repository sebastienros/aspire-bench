#!/usr/bin/env bash
set -euo pipefail
cd /app
# The official daily CLI carries the bundle (dashboard, DCP) and always starts the AppHost.
# `aspire` on PATH is the same binary unless the image selected a source-built CLI.
official=/usr/local/aspire/aspire
"$official" --version
aspire --version
"$official" start --apphost /app/apphost.cs --non-interactive --isolated --nologo
"$official" wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 900 --nologo
"$official" wait bingoboard --apphost /app/apphost.cs --non-interactive --timeout 900 --nologo

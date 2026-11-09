#!/usr/bin/env bash
set -euo pipefail
cd /app
aspire --version
aspire start --apphost /app/apphost.cs --non-interactive --isolated --nologo
aspire wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 900 --nologo
aspire wait bingoboard --apphost /app/apphost.cs --non-interactive --timeout 900 --nologo

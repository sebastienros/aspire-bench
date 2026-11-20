#!/usr/bin/env bash
set -euo pipefail
cd /app
aspire --version
aspire start --apphost /app/apphost.cs --non-interactive --isolated --nologo
aspire wait api --apphost /app/apphost.cs --non-interactive --timeout 900 --nologo
aspire wait worker --apphost /app/apphost.cs --non-interactive --timeout 900 --nologo

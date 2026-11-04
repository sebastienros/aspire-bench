#!/usr/bin/env bash
set -euo pipefail
cd /app
aspire resource boardadmin stop --apphost /app/apphost.cs --non-interactive --nologo
aspire resource migrations rebuild --apphost /app/apphost.cs --non-interactive --nologo
aspire wait migrations --apphost /app/apphost.cs --non-interactive --timeout 120 --nologo
aspire resource boardadmin rebuild --apphost /app/apphost.cs --non-interactive --nologo
aspire wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 120 --nologo

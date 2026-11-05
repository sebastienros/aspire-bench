#!/usr/bin/env bash
set -euo pipefail
cd /app
aspire resource boardadmin stop --apphost /app/apphost.cs --non-interactive --nologo
aspire resource migrations rebuild --apphost /app/apphost.cs --non-interactive --nologo
aspire resource migrations start --apphost /app/apphost.cs --non-interactive --nologo
aspire resource boardadmin rebuild --apphost /app/apphost.cs --non-interactive --nologo
aspire resource boardadmin start --apphost /app/apphost.cs --non-interactive --nologo
if ! aspire wait boardadmin --apphost /app/apphost.cs --non-interactive --timeout 120 --nologo; then
    aspire logs migrations --apphost /app/apphost.cs --non-interactive --nologo
    aspire logs boardadmin --apphost /app/apphost.cs --non-interactive --nologo
    exit 1
fi

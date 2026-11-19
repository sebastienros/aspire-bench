The Bingo application in /app is running under Aspire (README.md describes this
workspace). Its admin backend keeps its distributed cache (player state, approvals,
called squares) in process memory.

Add Redis to the application's AppHost and make the admin backend (resource
`boardadmin`) keep its distributed cache in that Redis instead. Keep all existing
data and all existing functionality, and leave the application running.
You have approval to make these changes; do not stop to ask for confirmation. No report is required.

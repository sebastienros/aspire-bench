The Bingo application in /app runs today with its own launcher (README.md describes it)
and has no Aspire AppHost.

Add Aspire to it: create an AppHost that runs the whole application under Aspire
(PostgreSQL, Redis, the migration worker, the admin backend and the player frontend),
start the application under Aspire, and leave it running. The application must run
under Aspire only. Name the admin backend's resource `boardadmin` and the player
frontend's resource `bingoboard`.

Keep the existing code: you may add files and add lines (for example Aspire service
defaults), but do not change or remove existing lines.
You have approval to make these changes; do not stop to ask for confirmation. No report is required.

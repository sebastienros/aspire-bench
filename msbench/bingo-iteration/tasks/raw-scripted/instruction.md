The Bingo application is already running. Work in /app.

The producer API works at the admin origin, but producer requests made through
the player origin do not reach it. Repair the frontend routing so that the
existing /api/demo/producer routes work through the player origin, including
square import, call/clear, and status. Preserve backend validation and errors.
Keep /api/version-info and /bingohub working.

Use the running app and the origins in benchmark-endpoints.json; do not hardcode
ports. Make the smallest source change in src/bingo-board/vite.config.js.
Verify the actual running behavior, not just resource readiness or source text.
Do not restart the backend, database, or Redis, delete data, change other source
files/guidance, or modify benchmark-endpoints.json. The frontend's normal config
reload is allowed. Existing squares and called-square state must survive.
Leave the application running; the harness owns cleanup. No JSON report is required.

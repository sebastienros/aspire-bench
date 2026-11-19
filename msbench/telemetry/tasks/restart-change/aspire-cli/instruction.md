The Bingo application in /app is running and players are in the middle of tonight's game.

The producers want the admin status endpoint (`GET /api/demo/producer/status`) to also
report `calledCount`, the number of squares called so far, next to `calledSquares`.
Make that change in the admin backend and put it live now.

Players are connected: keep the player site, the database and the cache running while
you do it, and restart only what the change needs. Keep all existing data and all
existing functionality, and leave the application running. README.md describes this
workspace. No report is required.

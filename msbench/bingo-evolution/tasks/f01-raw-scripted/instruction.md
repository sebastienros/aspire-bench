The Bingo application in `/app` is already running with existing PostgreSQL
records and Redis player state. Add a live square catalog for player-origin
clients:

- `GET /api/demo/producer/catalog` returns a JSON array of all active database
  squares, ordered by ID ascending. Each item has exactly `id`, `label`, `type`
  (including null), and `isChecked` (the current global Redis called-state).
- Optional `?type=value` filters by an exact type match. An unknown type returns
  an empty array. Inactive squares must never appear.
- The same API works through both the player and admin origins. Imports, label
  edits and global call/clear operations must appear on the next catalog request;
  do not serve static samples or stale process-local state.

Use the existing application layers. This is a warm-running change, not a cold
startup task. You may edit application source, add files, and rebuild/restart
application processes as needed. Keep the existing dependency containers running;
do not reset or replace the database, schema, old square/user records, or Redis
state. Preserve login, version information, SignalR negotiation, and the existing
producer import/status/call/clear behavior, including invalid-input errors.

`benchmark-endpoints.json` contains the two current origins. Do not edit that
file, existing guidance/skills/scripts, original applied migrations, or anything
outside `/app`. Keep the pinned toolchain/dependencies. Leave the working app
running. No success report is required; completion is checked independently.

The Bingo application in `/app` is already running against an existing populated
PostgreSQL database. Add a persisted description to square templates:

- Extend the EF square model with `Description`, a non-null string of at most
  280 characters. Add an additive EF migration and update the model snapshot.
  Apply the migration to the existing database: every legacy square, including
  inactive ones, gets an empty description without losing any original columns
  or values. New SQL inserts that omit the column must also default to empty.
- `GET /api/demo/producer/squares/{squareId}/description` returns exactly
  `{ "id": "<stored ID>", "description": "<stored text>" }`.
- `PUT` to that route accepts `{ "description": "<text>" }`, persists the exact
  text (including whitespace), and returns the same object. Empty text and
  280-character text are valid. Missing/null text or over 280 characters returns
  400 without changing the saved value. Unknown IDs return 404 on GET and valid
  PUT. Both active and inactive legacy squares can be read/updated.
- Both routes work through player and admin origins and read real persisted
  values, not an in-memory cache. Updating a description must not modify the
  square's other columns.

This is a warm-running schema/data evolution task, not a cold startup task.
You may edit application source, add files, and rebuild/restart application
processes and run the migration worker as needed. Keep the existing dependency
containers running. Do not recreate the database/tables, delete/reseed old rows,
rewrite applied migrations, or clear Redis. Preserve old square/user identifiers
and contents, original migration history, login, version information, SignalR
negotiation, and existing producer behavior.

`benchmark-endpoints.json` contains the two current origins. Do not edit that
file, existing guidance/skills/scripts, original applied migrations, or anything
outside `/app`. Keep the pinned toolchain/dependencies. Leave the migrated app
running. No success report is required; completion is checked independently.

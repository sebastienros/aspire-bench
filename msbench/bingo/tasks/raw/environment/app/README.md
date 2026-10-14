# Bingo

A Bingo application with an admin portal and a player frontend.

The application sources, dependency definitions and build configuration are
included in this folder. See `LICENSE` for the application's MIT license.

Leave application services running after completing the task. Launch long-lived
services as detached processes, not attached asynchronous tool jobs, so the agent
session can finish while the application remains available for verification.
Retain logs and process identifiers for targeted shutdown.

The Bingo application in /app is configured for a local production deployment;
README.md describes it.

Publish the application and run its production build locally, built from the sources
in this repository, and leave it running. The admin application must answer on
http://127.0.0.1:18080 and the player frontend on http://127.0.0.1:18081, with admin
login, the existing catalog, the frontend's version routing, SignalR updates and
Redis-backed player boards working.

Use the supplied deployment configuration, PostgreSQL, Redis, network and volume as
they are: do not change or replace them or their data, and do not substitute
development servers for the production build. No cloud provisioning, registry pushes
or tool installation. No report is required.

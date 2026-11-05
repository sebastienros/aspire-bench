Publish and run the configured Bingo application as a real isolated local
production deployment. Leave it running and verify that admin login, the
existing catalog, frontend version routing, SignalR updates and Redis-backed
player boards work.

Preserve the supplied application and deployment configuration, existing
SQL/Redis data, credentials and environment-owned dependencies, network and
volume. Do not replace them or affect neighboring workloads.

The admin and frontend must be available on loopback ports 18080 and 18081.
Only runtime artifacts under deployment/ may change. Do not substitute
development servers for the production application or write a success report
instead of deploying. No cloud provisioning, registry pushes or tool installation.

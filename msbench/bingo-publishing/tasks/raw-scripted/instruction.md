Publish and run Bingo as a real isolated local production deployment. Read README.md.
Write `/app/deployment/deploy.sh`, a repeatable, non-interactive deployment command,
and `/app/deployment/docker-compose.yaml`. Use the supplied Dockerfiles and useful
Docker/Compose recipe as your baseline. Run your script and leave the app running.

Serve admin on loopback port 18080 and the built static Vue frontend on loopback
port 18081. The frontend must reach the deployed admin's version API and real
SignalR hub. Admin login, existing catalog (including supplied extra data), and
Redis-backed player boards must work in Production; the developer producer API
must remain unavailable. Preserve the environment-owned dependencies and data.

Deployment services must run published .NET DLLs and nginx static output, not
AppHost, Vite, source-mounted code, dev/preview servers, or host application
processes. Only `deployment/` is editable. Do not write a success report instead
of deploying. No cloud provisioning, registry pushes, or tools installation.

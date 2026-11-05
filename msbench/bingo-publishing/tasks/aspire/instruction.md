Publish and run Bingo as a real isolated local production deployment. Read README.md.
Write `/app/deployment/deploy.sh`, a repeatable, non-interactive deployment command,
and generate `/app/deployment/docker-compose.yaml` from the AppHost. Run your
script and leave the app running.

Use the supplied version-compatible Aspire CLI and Hosting 13.6.0. Add
`AddDockerComposeEnvironment` to `apphost.cs`, model the existing production
Dockerfiles with `AddDockerfile`, and use Aspire's generated Compose artifacts
and image-build/deployment pipeline. Do not hand-author/eject the final YAML or
package the AppHost as a workload. `aspire publish` and the target's prepare/deploy
steps are available; use `--non-interactive`. The Docker integration's
`ConfigureComposeFile` API supports external networks. No package upgrades.
Use `WithDashboard(false)` for this two-workload deployment. Dockerfile builds
and generated service image references must use the same explicit local tags;
`WithImageTag` and `ConfigureComposeFile` service `Image` support this in 13.6.
Apply prepare's `.env.Production`, not publish's placeholder `.env`.

Serve admin on loopback port 18080 and the built static Vue frontend on loopback
port 18081. The frontend must reach the deployed admin's version API and real
SignalR hub. Admin login, existing catalog (including supplied extra data), and
Redis-backed player boards must work in Production; the developer producer API
must remain unavailable. Preserve the environment-owned dependencies and data.

Deployment services must run published .NET DLLs and nginx static output, not
AppHost, Vite, source-mounted code, dev/preview servers, or host application
processes. Only `deployment/` and `apphost.cs` are editable. Do not write a success
report instead of deploying. No cloud provisioning, registry pushes, or tools installation.

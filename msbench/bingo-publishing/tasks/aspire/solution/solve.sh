#!/usr/bin/env bash
set -euo pipefail
cd /app
if node /opt/benchmark/grade.mjs verify --runtime-only >/tmp/p01-noop.log 2>&1; then
    echo "Grader incorrectly accepted no deployment" >&2
    exit 1
fi
grep -q "Exactly two published deployment services required" /tmp/p01-noop.log
echo "Rejected no-op deployment"
mkdir -p deployment
cat >apphost.cs <<'CS'
#:sdk Aspire.AppHost.Sdk@13.6.0
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.Docker@13.6.0

using Aspire.Hosting.Docker.Resources.ComposeNodes;

var builder = DistributedApplication.CreateBuilder(args);
builder.AddDockerComposeEnvironment("compose")
    .ConfigureComposeFile(file =>
    {
        file.Name = "p01-deploy";
        file.Networks.Clear();
        file.Networks["p01-net"] = new Network { Name = "p01-net", External = true };
        foreach (var (name, service) in file.Services)
        {
            service.Networks = ["p01-net"];
            service.Ports = [name == "boardadmin" ? "127.0.0.1:18080:8080" : "127.0.0.1:18081:8080"];
        }
    });
var db = builder.AddConnectionString("db");
var cache = builder.AddConnectionString("cache");
var password = builder.AddParameter("admin-password", secret: true);
var admin = builder.AddDockerfile("boardadmin", ".", "Dockerfile.dotnet")
    .WithBuildArg("PROJECT", "BingoBoard.Admin")
    .WithReference(db)
    .WithReference(cache)
    .WithEnvironment("Authentication__AdminPassword", password)
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", "Production")
    .WithEnvironment("DOTNET_ENVIRONMENT", "Production")
    .WithHttpEndpoint(port: 18080, targetPort: 8080);
builder.AddDockerfile("bingoboard", "src/bingo-board", "Dockerfile.nginx")
    .WithEnvironment("BINGO_ADMIN_URL", admin.GetEndpoint("http"))
    .WithHttpEndpoint(port: 18081, targetPort: 8080);
builder.Build().Run();
CS
cat >deployment/deploy.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
cd /app
source deployment-inputs.env
aspire do prepare-compose --apphost /app/apphost.cs --output-path /app/deployment --non-interactive
docker compose -p p01-deploy -f deployment/docker-compose.yaml --env-file deployment/.env up -d
SH
source deployment-inputs.env
aspire publish --apphost /app/apphost.cs --output-path /app/deployment --non-interactive
if node /opt/benchmark/grade.mjs verify --runtime-only >/tmp/p01-publish-only.log 2>&1; then
    echo "Grader incorrectly accepted publish-only artifacts" >&2
    exit 1
fi
grep -q "Exactly two published deployment services required" /tmp/p01-publish-only.log
echo "Rejected publish-only artifacts without deployment"
bash deployment/deploy.sh
for attempt in {1..60}; do
    if curl -fsS http://127.0.0.1:18081/api/version-info >/dev/null; then break; fi
    sleep 1
done
node /opt/benchmark/grade.mjs verify
bash /opt/benchmark/negative.sh

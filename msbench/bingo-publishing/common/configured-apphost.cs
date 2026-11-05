#:sdk Aspire.AppHost.Sdk@13.6.0
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.Docker@13.6.0

using Aspire.Hosting.Docker.Resources.ComposeNodes;

var builder = DistributedApplication.CreateBuilder(args);
builder.AddDockerComposeEnvironment("compose")
    .WithDashboard(false)
    .ConfigureComposeFile(file =>
    {
        file.Name = "p01-deploy";
        file.Networks.Clear();
        file.Networks["p01-net"] = new Network { Name = "p01-net", External = true };
        foreach (var (name, service) in file.Services)
        {
            service.Image = $"{name}:local";
            service.Networks = ["p01-net"];
            service.Ports = [name == "boardadmin" ? "127.0.0.1:18080:8080" : "127.0.0.1:18081:8080"];
        }
    });
var db = builder.AddConnectionString("db");
var cache = builder.AddConnectionString("cache");
var password = builder.AddParameter("admin-password", secret: true);
var admin = builder.AddDockerfile("boardadmin", ".", "Dockerfile.dotnet")
    .WithImageTag("local")
    .WithBuildArg("PROJECT", "BingoBoard.Admin")
    .WithReference(db)
    .WithReference(cache)
    .WithEnvironment("Authentication__AdminPassword", password)
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", "Production")
    .WithEnvironment("DOTNET_ENVIRONMENT", "Production")
    .WithHttpEndpoint(port: 18080, targetPort: 8080);
builder.AddDockerfile("bingoboard", "src/bingo-board", "Dockerfile.nginx")
    .WithImageTag("local")
    .WithEnvironment("BINGO_ADMIN_URL", admin.GetEndpoint("http"))
    .WithHttpEndpoint(port: 18081, targetPort: 8080);
builder.Build().Run();

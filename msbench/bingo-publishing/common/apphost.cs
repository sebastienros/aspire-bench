#:sdk Aspire.AppHost.Sdk@13.6.0
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.Docker@13.6.0

var builder = DistributedApplication.CreateBuilder(args);
var db = builder.AddConnectionString("db");
var cache = builder.AddConnectionString("cache");
var password = builder.AddParameter("admin-password", secret: true);

builder.AddDockerfile("boardadmin", ".", "Dockerfile.dotnet")
    .WithBuildArg("PROJECT", "BingoBoard.Admin")
    .WithReference(db)
    .WithReference(cache)
    .WithEnvironment("Authentication__AdminPassword", password)
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", "Production")
    .WithEnvironment("DOTNET_ENVIRONMENT", "Production")
    .WithHttpEndpoint(port: 18080, targetPort: 8080);

builder.Build().Run();

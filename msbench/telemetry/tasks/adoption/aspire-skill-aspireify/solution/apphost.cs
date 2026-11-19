#:sdk Aspire.AppHost.Sdk@17.1.0-preview.1.26567.3
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.PostgreSQL@17.1.0-preview.1.26567.3
#:package Aspire.Hosting.Redis@17.1.0-preview.1.26567.3
#:package Aspire.Hosting.JavaScript@17.1.0-preview.1.26567.3
#:project src/BingoBoard.Admin/BingoBoard.Admin.csproj
#:project src/BingoBoard.MigrationService/BingoBoard.MigrationService.csproj

var builder = DistributedApplication.CreateBuilder(args);
var password = builder.AddParameter("admin-password", secret: true);
var cache = builder.AddRedis("cache");
var db = builder.AddPostgres("postgres").WithDataVolume().AddDatabase("db");
var migrations = builder.AddProject<Projects.BingoBoard_MigrationService>("migrations")
    .WithEnvironment("Authentication__AdminPassword", password)
    .WithReference(db).WaitFor(db);
var admin = builder.AddProject<Projects.BingoBoard_Admin>("boardadmin", launchProfileName: "http")
    .WithEnvironment("Authentication__AdminPassword", password)
    .WithReference(db).WithReference(cache)
    .WaitFor(db).WaitFor(cache).WaitForCompletion(migrations)
    .WithHttpHealthCheck("/api/version-info");
builder.AddViteApp("bingoboard", "src/bingo-board").WithNpm(installCommand: "ci")
    .WithEnvironment("BINGO_ADMIN_URL", admin.GetEndpoint("http")).WithReference(admin)
    .WithHttpHealthCheck("/").WaitFor(admin);
builder.Build().Run();

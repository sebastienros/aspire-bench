#:sdk Aspire.AppHost.Sdk@13.6.0
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.PostgreSQL@13.6.0
#:package Aspire.Hosting.Redis@13.6.0
#:package Aspire.Hosting.JavaScript@13.6.0
#:project src/BingoBoard.Admin/BingoBoard.Admin.csproj
#:project src/BingoBoard.MigrationService/BingoBoard.MigrationService.csproj

var builder = DistributedApplication.CreateBuilder(args);
var runId = Environment.GetEnvironmentVariable("BENCH_RUN_ID")
    ?? throw new InvalidOperationException("BENCH_RUN_ID required");
var password = builder.AddParameter("admin-password", secret: true);
var cache = builder.AddRedis("cache").WithImageTag("8.6")
    .WithContainerName($"{runId}-redis");
var db = builder.AddPostgres("postgres").WithImageTag("18.3")
    .WithContainerName($"{runId}-postgres").WithDataVolume($"{runId}-data").AddDatabase("db");
var migrations = builder.AddProject<Projects.BingoBoard_MigrationService>("migrations")
    .WithEnvironment("Authentication__AdminPassword", password)
    .WithReference(db).WaitFor(db);
var admin = builder.AddProject<Projects.BingoBoard_Admin>("boardadmin", launchProfileName: "http")
    .WithEnvironment("Authentication__AdminPassword", password)
    .WithReference(db).WithReference(cache)
    .WaitFor(db).WaitFor(cache).WaitForCompletion(migrations)
    .WithHttpHealthCheck("/api/version-info").WithExternalHttpEndpoints();
builder.AddViteApp("bingoboard", "src/bingo-board").WithNpm(installCommand: "ci")
    .WithEnvironment("BINGO_ADMIN_URL", admin.GetEndpoint("http")).WithReference(admin)
    .WithHttpHealthCheck("/").WaitFor(admin);
builder.Build().Run();

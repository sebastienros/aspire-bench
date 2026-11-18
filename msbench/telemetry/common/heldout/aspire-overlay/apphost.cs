#:sdk Aspire.AppHost.Sdk@17.1.0-preview.1.26567.3
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.SqlServer@17.1.0-preview.1.26567.3
#:package Aspire.Hosting.RabbitMQ@17.1.0-preview.1.26567.3
#:project src/Shop.Api/Shop.Api.csproj
#:project src/Shop.Worker/Shop.Worker.csproj

var builder = DistributedApplication.CreateBuilder(args);
var runId = Environment.GetEnvironmentVariable("BENCH_RUN_ID")
    ?? throw new InvalidOperationException("BENCH_RUN_ID is required. Use the benchmark harness.");

var db = builder.AddSqlServer("sql")
    .WithImageTag("2022-CU28-ubuntu-22.04")
    .WithContainerName($"{runId}-sql")
    .WithDataVolume($"{runId}-sql-data")
    .WithEnvironment("MSSQL_MEMORY_LIMIT_MB", "2048")
    .AddDatabase("shopdb");

var messaging = builder.AddRabbitMQ("messaging")
    .WithManagementPlugin()
    .WithContainerName($"{runId}-rabbitmq")
    .WithDataVolume($"{runId}-rabbitmq-data");

var api = builder.AddProject<Projects.Shop_Api>("api", launchProfileName: "http")
    .WithEnvironment("Aspire__UseServiceDefaults", "true")
    .WithReference(db)
    .WithReference(messaging)
    .WaitFor(db)
    .WaitFor(messaging)
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints()
    .WithUrl("/", "Storefront");

// The API creates the schema on startup, so the worker starts after it.
builder.AddProject<Projects.Shop_Worker>("worker")
    .WithEnvironment("Aspire__UseServiceDefaults", "true")
    .WithReference(db)
    .WithReference(messaging)
    .WaitFor(api);

builder.Build().Run();

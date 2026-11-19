#:sdk Aspire.AppHost.Sdk@17.1.0-preview.1.26567.3
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.PostgreSQL@17.1.0-preview.1.26567.3
#:project ../../client/AuditClient.csproj

// PLAN T4.1 audit row `postgres`: the hosting integration with its defaults and one client.
var builder = DistributedApplication.CreateBuilder(args);
var res = builder.AddPostgres("postgres");
builder.AddProject<Projects.AuditClient>("audit-client")
    .WithEnvironment("AUDIT_KIND", "postgres")
    .WithEnvironment("AUDIT_RESOURCE", "postgres")
    .WithReference(res)
    .WaitFor(res);
builder.Build().Run();

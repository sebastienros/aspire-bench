#:sdk Aspire.AppHost.Sdk@17.1.0-preview.1.26567.3
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.Valkey@17.1.0-preview.1.26567.3
#:project ../../client/AuditClient.csproj

// PLAN T4.1 audit row `valkey`: the hosting integration with its defaults and one client.
var builder = DistributedApplication.CreateBuilder(args);
var res = builder.AddValkey("valkey");
builder.AddProject<Projects.AuditClient>("audit-client")
    .WithEnvironment("AUDIT_KIND", "valkey")
    .WithEnvironment("AUDIT_RESOURCE", "valkey")
    .WithReference(res)
    .WaitFor(res);
builder.Build().Run();

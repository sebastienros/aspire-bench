#:sdk Aspire.AppHost.Sdk@17.1.0-preview.1.26567.3
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.Nats@17.1.0-preview.1.26567.3
#:project ../../client/AuditClient.csproj

// PLAN T4.1 audit row `nats`: the hosting integration with its defaults and one client.
var builder = DistributedApplication.CreateBuilder(args);
var res = builder.AddNats("nats");
builder.AddProject<Projects.AuditClient>("audit-client")
    .WithEnvironment("AUDIT_KIND", "nats")
    .WithEnvironment("AUDIT_RESOURCE", "nats")
    .WithReference(res)
    .WaitFor(res);
builder.Build().Run();

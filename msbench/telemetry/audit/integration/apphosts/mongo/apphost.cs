#:sdk Aspire.AppHost.Sdk@17.1.0-preview.1.26567.3
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.MongoDB@17.1.0-preview.1.26567.3
#:project ../../client/AuditClient.csproj

// PLAN T4.1 audit row `mongo`: the hosting integration with its defaults and one client.
var builder = DistributedApplication.CreateBuilder(args);
var res = builder.AddMongoDB("mongo");
builder.AddProject<Projects.AuditClient>("audit-client")
    .WithEnvironment("AUDIT_KIND", "mongo")
    .WithEnvironment("AUDIT_RESOURCE", "mongo")
    .WithReference(res)
    .WaitFor(res);
builder.Build().Run();

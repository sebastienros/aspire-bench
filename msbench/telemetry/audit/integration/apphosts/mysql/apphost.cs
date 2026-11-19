#:sdk Aspire.AppHost.Sdk@17.1.0-preview.1.26567.3
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.MySql@17.1.0-preview.1.26567.3
#:project ../../client/AuditClient.csproj

// PLAN T4.1 audit row `mysql`: the hosting integration with its defaults and one client.
var builder = DistributedApplication.CreateBuilder(args);
var res = builder.AddMySql("mysql");
builder.AddProject<Projects.AuditClient>("audit-client")
    .WithEnvironment("AUDIT_KIND", "mysql")
    .WithEnvironment("AUDIT_RESOURCE", "mysql")
    .WithReference(res)
    .WaitFor(res);
builder.Build().Run();

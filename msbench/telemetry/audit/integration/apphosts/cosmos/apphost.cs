#:sdk Aspire.AppHost.Sdk@17.1.0-preview.1.26567.3
#:property AspireUseCliBundle=true
#:property ManagePackageVersionsCentrally=false
#:package Aspire.Hosting.Azure.CosmosDB@17.1.0-preview.1.26567.3
#:project ../../client/AuditClient.csproj

// PLAN T4.1 audit row `cosmos`: the hosting integration with its defaults and one client.
var builder = DistributedApplication.CreateBuilder(args);
var res = builder.AddAzureCosmosDB("cosmos").RunAsEmulator();
builder.AddProject<Projects.AuditClient>("audit-client")
    .WithEnvironment("AUDIT_KIND", "cosmos")
    .WithEnvironment("AUDIT_RESOURCE", "cosmos")
    .WithReference(res)
    .WaitFor(res);
builder.Build().Run();

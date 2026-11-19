// PLAN T4.1 audit client. Registers exactly one Aspire client integration (AUDIT_KIND) against the
// connection the AppHost passes as AUDIT_RESOURCE, and repeats one ordinary operation every 2 s
// inside an "audit.op" activity, so each call to the dependency should appear as a child span.
using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Text;
using Confluent.Kafka;
using Microsoft.Azure.Cosmos;
using MongoDB.Bson;
using MongoDB.Driver;
using MySqlConnector;
using NATS.Client.Core;
using Npgsql;
using OpenTelemetry;
using OpenTelemetry.Trace;
using Qdrant.Client;
using RabbitMQ.Client;
using StackExchange.Redis;
using Azure.Storage.Blobs;
using Microsoft.Data.SqlClient;

var builder = Host.CreateApplicationBuilder(args);
var kind = builder.Configuration["AUDIT_KIND"] ?? throw new InvalidOperationException("AUDIT_KIND is required");
var name = builder.Configuration["AUDIT_RESOURCE"] ?? kind;
var source = new ActivitySource("audit");

builder.Services.AddOpenTelemetry()
    .WithTracing(t => t.AddSource("audit").AddHttpClientInstrumentation())
    .UseOtlpExporter();

Func<IServiceProvider, Task> op = kind switch
{
    "postgres" => Register(() => builder.AddNpgsqlDataSource(name), async sp =>
    {
        await using var cmd = sp.GetRequiredService<NpgsqlDataSource>().CreateCommand("SELECT count(*) FROM pg_stat_activity");
        await cmd.ExecuteScalarAsync();
    }),
    "redis" or "valkey" or "garnet" => Register(() => builder.AddRedisClient(name), async sp =>
    {
        var db = sp.GetRequiredService<IConnectionMultiplexer>().GetDatabase();
        await db.StringSetAsync("audit:last", DateTimeOffset.UtcNow.ToString("O"));
        await db.StringGetAsync("audit:last");
    }),
    "sqlserver" => Register(() => builder.AddSqlServerClient(name), async sp =>
    {
        using var scope = sp.CreateScope();
        var connection = scope.ServiceProvider.GetRequiredService<SqlConnection>();
        await connection.OpenAsync();
        await using var cmd = new SqlCommand("SELECT count(*) FROM sys.databases", connection);
        await cmd.ExecuteScalarAsync();
    }),
    "mysql" => Register(() => builder.AddMySqlDataSource(name), async sp =>
    {
        await using var cmd = sp.GetRequiredService<MySqlDataSource>().CreateCommand("SELECT count(*) FROM information_schema.schemata");
        await cmd.ExecuteScalarAsync();
    }),
    "mongo" => Register(() => builder.AddMongoDBClient(name), async sp =>
    {
        var collection = sp.GetRequiredService<IMongoClient>().GetDatabase("audit").GetCollection<BsonDocument>("events");
        await collection.InsertOneAsync(new BsonDocument("at", DateTime.UtcNow));
        await collection.CountDocumentsAsync(FilterDefinition<BsonDocument>.Empty);
    }),
    "rabbitmq" => Register(() => builder.AddRabbitMQClient(name), async sp =>
    {
        await using var channel = await sp.GetRequiredService<IConnection>().CreateChannelAsync();
        await channel.QueueDeclareAsync("audit", durable: false, exclusive: false, autoDelete: false);
        await channel.BasicPublishAsync("", "audit", Encoding.UTF8.GetBytes(DateTimeOffset.UtcNow.ToString("O")));
    }),
    "kafka" => Register(() => builder.AddKafkaProducer<string, string>(name), async sp =>
    {
        await sp.GetRequiredService<IProducer<string, string>>().ProduceAsync("audit",
            new Message<string, string> { Key = "audit", Value = DateTimeOffset.UtcNow.ToString("O") });
    }),
    "nats" => Register(() => builder.AddNatsClient(name), async sp =>
    {
        await sp.GetRequiredService<INatsConnection>().PublishAsync("audit.events", DateTimeOffset.UtcNow.ToString("O"));
    }),
    "storage" => Register(() => builder.AddAzureBlobServiceClient(name), async sp =>
    {
        var container = sp.GetRequiredService<BlobServiceClient>().GetBlobContainerClient("audit");
        await container.CreateIfNotExistsAsync();
        await container.UploadBlobAsync($"op-{Guid.NewGuid():N}.txt", BinaryData.FromString("audit"));
    }),
    "cosmos" => Register(() => builder.AddAzureCosmosClient(name), async sp =>
    {
        var client = sp.GetRequiredService<CosmosClient>();
        var database = (await client.CreateDatabaseIfNotExistsAsync("audit")).Database;
        var container = (await database.CreateContainerIfNotExistsAsync("events", "/id")).Container;
        var id = Guid.NewGuid().ToString("N");
        await container.CreateItemAsync(new { id }, new PartitionKey(id));
    }),
    "qdrant" => Register(() => builder.AddQdrantClient(name), async sp =>
    {
        await sp.GetRequiredService<QdrantClient>().ListCollectionsAsync();
    }),
    "keycloak" => Register(() => builder.Services.AddHttpClient("keycloak").ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        // Aspire's development certificate is not trusted by this process inside the audit image.
        ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator,
    }), async sp =>
    {
        // No Aspire client package talks to Keycloak directly (Aspire.Keycloak.Authentication
        // configures token validation); the realm discovery document is the call an app makes.
        // Any endpoint Aspire passes for it (at the pin the endpoint named "http" serves https).
        var url = builder.Configuration.GetSection($"services:{name}").GetChildren()
            .SelectMany(endpoint => endpoint.GetChildren()).Select(entry => entry.Value)
            .FirstOrDefault(value => value is not null) ?? throw new InvalidOperationException("no keycloak endpoint");
        var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient("keycloak");
        (await http.GetAsync($"{url}/realms/master/.well-known/openid-configuration")).EnsureSuccessStatusCode();
    }),
    "seq" => Register(() => builder.AddSeqEndpoint(name), sp =>
    {
        sp.GetRequiredService<ILoggerFactory>().CreateLogger("audit").LogInformation("audit tick {At}", DateTimeOffset.UtcNow);
        return Task.CompletedTask;
    }),
    _ => throw new InvalidOperationException($"Unknown AUDIT_KIND {kind}"),
};

builder.Services.AddHostedService(sp => new Loop(sp, op, source, kind, sp.GetRequiredService<ILogger<Loop>>()));
builder.Build().Run();

static Func<IServiceProvider, Task> Register(Action register, Func<IServiceProvider, Task> operation)
{
    register();
    return operation;
}

sealed class Loop(IServiceProvider services, Func<IServiceProvider, Task> op, ActivitySource source, string kind, ILogger<Loop> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using (var activity = source.StartActivity("audit.op"))
            {
                activity?.SetTag("audit.kind", kind);
                try
                {
                    await op(services);
                }
                catch (Exception error)
                {
                    activity?.SetStatus(ActivityStatusCode.Error, error.Message);
                    logger.LogWarning("audit op failed: {Message}", error.Message);
                }
            }
            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }
}

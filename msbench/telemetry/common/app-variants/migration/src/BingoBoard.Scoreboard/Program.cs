// Scoreboard: a read-only summary of tonight's game for the venue screen. It reads the admin
// backend's status through service discovery (http://boardadmin) and never writes anything.
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();
builder.Services.AddHttpClient("admin", client => client.BaseAddress = new Uri("http://boardadmin"));

var app = builder.Build();
app.MapDefaultEndpoints();

app.MapGet("/api/scoreboard", async (IHttpClientFactory factory, CancellationToken cancellationToken) =>
{
    using var status = JsonDocument.Parse(
        await factory.CreateClient("admin").GetStringAsync("/api/demo/producer/status", cancellationToken));
    var called = status.RootElement.GetProperty("calledSquares").GetArrayLength();
    return Results.Ok(new { calledSquares = called, generatedAt = DateTimeOffset.UtcNow });
});
app.MapGet("/", () => Results.Text("Bingo scoreboard. GET /api/scoreboard for tonight's totals."));

app.Run();

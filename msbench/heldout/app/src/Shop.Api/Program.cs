using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Shop.Api;
using Shop.Data;

var builder = WebApplication.CreateBuilder(args);

var databaseConnection = builder.Configuration.GetConnectionString("shopdb")
    ?? throw new InvalidOperationException("Connection string 'shopdb' is required.");

builder.Services.AddDbContext<ShopDb>(options => options.UseSqlServer(databaseConnection));
builder.Services.AddSingleton<OrderQueue>();
builder.Services.AddMemoryCache();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ShopDb>();
    await db.Database.EnsureCreatedAsync();
    if (!await db.Products.AnyAsync())
    {
        db.Products.AddRange(
            new Product { Id = 1, Name = "Trail running shoes", Price = 129.00m, Stock = 1_000_000 },
            new Product { Id = 2, Name = "Rain jacket", Price = 89.50m, Stock = 1_000_000 },
            new Product { Id = 3, Name = "Merino socks (3 pack)", Price = 24.90m, Stock = 1_000_000 },
            new Product { Id = 4, Name = "Headlamp", Price = 39.00m, Stock = 1_000_000 },
            new Product { Id = 5, Name = "Water bottle", Price = 19.00m, Stock = 1_000_000 },
            new Product { Id = 6, Name = "Day pack", Price = 74.00m, Stock = 1_000_000 });
        await db.SaveChangesAsync();
    }
}

app.UseDefaultFiles();
app.UseStaticFiles();

var api = app.MapGroup("/api");

// The catalogue changes rarely, so the product list is served from memory for a short time.
api.MapGet("/products", async (ShopDb db, IMemoryCache cache, IConfiguration configuration) =>
    await cache.GetOrCreateAsync("products", async entry =>
    {
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(configuration.GetValue("Catalog:CacheSeconds", 30));
        return await db.Products.AsNoTracking().OrderBy(p => p.Id)
            .Select(p => new { p.Id, p.Name, p.Price, InStock = p.Stock > 0 })
            .ToListAsync();
    }));

api.MapPost("/orders", async (PlaceOrder request, ShopDb db, OrderQueue queue, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Customer) || request.Customer.Length > 64 || request.Quantity is < 1 or > 10)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["order"] = ["A customer (up to 64 characters) and a quantity from 1 to 10 are required."]
        });
    }
    if (!await db.Products.AnyAsync(p => p.Id == request.ProductId, cancellationToken))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["productId"] = ["Unknown product."] });
    }
    var order = new Order
    {
        Number = $"SO-{Convert.ToHexString(RandomNumberGenerator.GetBytes(4))}",
        Customer = request.Customer.Trim(),
        ProductId = request.ProductId,
        Quantity = request.Quantity,
        PlacedAt = DateTime.UtcNow,
    };
    db.Orders.Add(order);
    await db.SaveChangesAsync(cancellationToken);
    // The worker allocates stock and confirms the order.
    await queue.PublishAsync(new OrderPlaced(order.Id, order.Number), cancellationToken);
    return Results.Created($"/api/orders/{order.Number}", OrderView.From(order));
});

api.MapGet("/orders", async (string customer, ShopDb db) =>
    await db.Orders.AsNoTracking()
        .Where(o => o.Customer == customer)
        .OrderByDescending(o => o.PlacedAt)
        .Take(20)
        .Select(o => new OrderView(o.Number, o.Customer, o.ProductId, o.Quantity, o.Status, o.PlacedAt, o.ConfirmedAt))
        .ToListAsync());

// The order page: the order and the latest carrier tracking updates for it.
api.MapGet("/orders/{number}", async (string number, ShopDb db) =>
{
    var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Number == number);
    if (order is null) return Results.NotFound();
    var events = await db.CarrierEvents
        .FromSql($"""
            SELECT TOP (20) Id, ReceivedAt, Payload FROM CarrierEvents
            WHERE JSON_VALUE(Payload, '$.orderNumber') = {number}
            ORDER BY ReceivedAt DESC
            """)
        .AsNoTracking()
        .ToListAsync();
    var tracking = events.Select(e =>
    {
        using var document = JsonDocument.Parse(e.Payload);
        var root = document.RootElement;
        return new TrackingView(e.ReceivedAt,
            root.TryGetProperty("status", out var status) ? status.GetString() : null,
            root.TryGetProperty("location", out var location) ? location.GetString() : null);
    });
    return Results.Ok(new { Order = OrderView.From(order), Tracking = tracking });
});

// Carrier webhook: tracking updates for shipped orders, stored as received.
api.MapPost("/carrier/events", async (JsonElement payload, ShopDb db) =>
{
    if (payload.ValueKind != JsonValueKind.Object || !payload.TryGetProperty("orderNumber", out _))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["orderNumber"] = ["Required."] });
    }
    db.CarrierEvents.Add(new CarrierEvent { ReceivedAt = DateTime.UtcNow, Payload = payload.GetRawText() });
    await db.SaveChangesAsync();
    return Results.Accepted();
});

app.Run();

public sealed record PlaceOrder(string Customer, int ProductId, int Quantity);

public sealed record OrderView(string Number, string Customer, int ProductId, int Quantity, string Status,
    DateTime PlacedAt, DateTime? ConfirmedAt)
{
    public static OrderView From(Order order) => new(order.Number, order.Customer, order.ProductId, order.Quantity,
        order.Status, order.PlacedAt, order.ConfirmedAt);
}

public sealed record TrackingView(DateTime ReceivedAt, string? Status, string? Location);

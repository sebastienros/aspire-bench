using Microsoft.EntityFrameworkCore;

namespace Shop.Data;

public sealed class ShopDb(DbContextOptions<ShopDb> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<CarrierEvent> CarrierEvents => Set<CarrierEvent>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Product>(product =>
        {
            product.Property(p => p.Id).ValueGeneratedNever();
            product.Property(p => p.Name).HasMaxLength(100);
            product.Property(p => p.Price).HasPrecision(10, 2);
        });

        model.Entity<Order>(order =>
        {
            order.Property(o => o.Number).HasMaxLength(16);
            order.Property(o => o.Customer).HasMaxLength(64);
            order.Property(o => o.Status).HasMaxLength(16);
            order.HasIndex(o => o.Number).IsUnique();
            order.HasIndex(o => new { o.Customer, o.PlacedAt });
        });

        // Carrier webhooks are stored as received; the payload is the carrier's JSON document.
        model.Entity<CarrierEvent>(carrierEvent =>
        {
            carrierEvent.Property(e => e.Payload).HasColumnType("nvarchar(max)");
        });
    }
}

public sealed class Product
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
}

public sealed class Order
{
    public int Id { get; set; }
    public required string Number { get; set; }
    public required string Customer { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public string Status { get; set; } = OrderStatus.Pending;
    public DateTime PlacedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
}

public static class OrderStatus
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Rejected = "Rejected";
}

public sealed class CarrierEvent
{
    public long Id { get; set; }
    public DateTime ReceivedAt { get; set; }
    public required string Payload { get; set; }
}

/// <summary>The message the API publishes when an order is placed.</summary>
public sealed record OrderPlaced(int OrderId, string Number);

public static class Queues
{
    public const string Orders = "orders";
}

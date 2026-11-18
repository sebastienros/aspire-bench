using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using Shop.Data;

namespace Shop.Worker;

/// <summary>
/// Consumes placed orders one at a time: allocates stock under the inventory lock and confirms
/// (or rejects) the order. A message is acknowledged only after the order is committed.
/// </summary>
public sealed class OrderConsumer(IServiceScopeFactory scopes, IConfiguration configuration, ILogger<OrderConsumer> logger)
    : BackgroundService
{
    // How long one allocation waits for the inventory lock before the message is retried.
    private static readonly TimeSpan LockWait = TimeSpan.FromSeconds(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var uri = configuration.GetConnectionString("messaging")
            ?? throw new InvalidOperationException("Connection string 'messaging' is required.");
        var factory = new ConnectionFactory { Uri = new Uri(uri), ClientProvidedName = "shop-worker" };
        await using var connection = await ConnectAsync(factory, stoppingToken);
        await using var channel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);
        await channel.QueueDeclareAsync(Queues.Orders, durable: true, exclusive: false, autoDelete: false,
            cancellationToken: stoppingToken);
        await channel.BasicQosAsync(0, 1, false, stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);
        consumer.ReceivedAsync += async (_, delivery) =>
        {
            var handled = false;
            try
            {
                var message = JsonSerializer.Deserialize<OrderPlaced>(delivery.Body.Span)
                    ?? throw new InvalidOperationException("Empty order message.");
                handled = await AllocateAsync(message, stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(exception, "Order message {DeliveryTag} could not be processed", delivery.DeliveryTag);
            }
            if (handled) await channel.BasicAckAsync(delivery.DeliveryTag, false, stoppingToken);
            else await channel.BasicNackAsync(delivery.DeliveryTag, false, requeue: true, stoppingToken);
        };
        await channel.BasicConsumeAsync(Queues.Orders, autoAck: false, consumer, stoppingToken);
        logger.LogInformation("Consuming orders from queue {Queue}", Queues.Orders);
        await Task.Delay(Timeout.Infinite, stoppingToken).ContinueWith(_ => { }, TaskScheduler.Default);
    }

    private async Task<bool> AllocateAsync(OrderPlaced message, CancellationToken cancellationToken)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ShopDb>();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        if (!await InventoryLock.TryAcquireAsync(db, transaction, LockWait, cancellationToken))
        {
            // Another allocation or a stock reconciliation holds the lock; try again shortly.
            logger.LogDebug("Inventory busy, order {Number} will be retried", message.Number);
            return false;
        }

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == message.OrderId, cancellationToken);
        if (order is null || order.Status != OrderStatus.Pending)
        {
            return true; // Already handled (a redelivery) or removed.
        }
        var product = await db.Products.FirstAsync(p => p.Id == order.ProductId, cancellationToken);
        if (product.Stock >= order.Quantity)
        {
            product.Stock -= order.Quantity;
            order.Status = OrderStatus.Confirmed;
        }
        else
        {
            order.Status = OrderStatus.Rejected;
        }
        order.ConfirmedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        logger.LogInformation("Order {Number} {Status}", order.Number, order.Status);
        return true;
    }

    private async Task<IConnection> ConnectAsync(ConnectionFactory factory, CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await factory.CreateConnectionAsync(cancellationToken);
            }
            catch (Exception exception) when (attempt < 30 && !cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning("Message broker not reachable yet ({Message}); retrying", exception.Message);
                await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
            }
        }
    }
}

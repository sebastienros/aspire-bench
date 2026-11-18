using System.Text.Json;
using RabbitMQ.Client;
using Shop.Data;

namespace Shop.Api;

/// <summary>Publishes order messages for the worker on one shared connection.</summary>
public sealed class OrderQueue(IConfiguration configuration) : IAsyncDisposable
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private IConnection? _connection;
    private IChannel? _channel;

    public async Task PublishAsync(OrderPlaced message, CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            var channel = await ChannelAsync(cancellationToken);
            var body = JsonSerializer.SerializeToUtf8Bytes(message);
            var properties = new BasicProperties { Persistent = true, ContentType = "application/json" };
            await channel.BasicPublishAsync(string.Empty, Queues.Orders, mandatory: true, properties, body, cancellationToken);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<IChannel> ChannelAsync(CancellationToken cancellationToken)
    {
        if (_channel is { IsOpen: true }) return _channel;
        if (_connection is not { IsOpen: true })
        {
            var uri = configuration.GetConnectionString("messaging")
                ?? throw new InvalidOperationException("Connection string 'messaging' is required.");
            var factory = new ConnectionFactory { Uri = new Uri(uri), ClientProvidedName = "shop-api" };
            _connection = await factory.CreateConnectionAsync(cancellationToken);
        }
        _channel = await _connection.CreateChannelAsync(cancellationToken: cancellationToken);
        await _channel.QueueDeclareAsync(Queues.Orders, durable: true, exclusive: false, autoDelete: false,
            cancellationToken: cancellationToken);
        return _channel;
    }

    public async ValueTask DisposeAsync()
    {
        if (_channel is not null) await _channel.DisposeAsync();
        if (_connection is not null) await _connection.DisposeAsync();
    }
}

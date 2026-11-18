using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Shop.Data;

/// <summary>
/// Serializes stock allocation across every process that changes stock (the order worker and
/// the stock reconciliation job) with a SQL Server application lock owned by the transaction.
/// </summary>
public static class InventoryLock
{
    public const string Resource = "inventory";

    public static async Task<bool> TryAcquireAsync(ShopDb db, IDbContextTransaction transaction,
        TimeSpan timeout, CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        await using var command = connection.CreateCommand();
        command.Transaction = transaction.GetDbTransaction();
        command.CommandText = """
            DECLARE @result int;
            EXEC @result = sp_getapplock @Resource = @resource, @LockMode = N'Exclusive',
                @LockOwner = N'Transaction', @LockTimeout = @timeout;
            SELECT @result;
            """;
        var resource = command.CreateParameter();
        resource.ParameterName = "@resource";
        resource.Value = Resource;
        command.Parameters.Add(resource);
        var milliseconds = command.CreateParameter();
        milliseconds.ParameterName = "@timeout";
        milliseconds.DbType = DbType.Int32;
        milliseconds.Value = (int)timeout.TotalMilliseconds;
        command.Parameters.Add(milliseconds);
        // 0 = granted, 1 = granted after waiting, negative = timeout, deadlock or error.
        var result = Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
        return result >= 0;
    }
}

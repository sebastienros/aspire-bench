using BingoBoard.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace BingoBoard.Admin.Endpoints;

public static class CatalogEndpoints
{
    public static IEndpointRouteBuilder MapCatalogEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/demo/producer/catalog", async (
            string? type,
            ApplicationDbContext db,
            IDistributedCache cache,
            CancellationToken cancellationToken) =>
        {
            var query = db.BingoSquares.AsNoTracking().Where(square => square.IsActive);
            if (type is not null)
            {
                query = query.Where(square => square.Type == type);
            }

            var squares = await query.OrderBy(square => square.Id).ToListAsync(cancellationToken);
            var result = new List<object>();
            foreach (var square in squares)
            {
                var stored = await cache.GetStringAsync($"global_square_{square.Id}", cancellationToken);
                result.Add(new
                {
                    square.Id,
                    square.Label,
                    square.Type,
                    IsChecked = bool.TryParse(stored, out var called) && called
                });
            }
            return Results.Ok(result);
        });
        return endpoints;
    }
}

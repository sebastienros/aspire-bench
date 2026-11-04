using BingoBoard.Data;
using Microsoft.EntityFrameworkCore;

namespace BingoBoard.Admin.Endpoints;

public static class DescriptionEndpoints
{
    public sealed record DescriptionInput(string? Description);

    public static IEndpointRouteBuilder MapDescriptionEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/demo/producer/squares");
        group.MapGet("/{squareId}/description", async (
            string squareId, ApplicationDbContext db, CancellationToken cancellationToken) =>
        {
            var square = await db.BingoSquares.AsNoTracking()
                .SingleOrDefaultAsync(square => square.Id == squareId, cancellationToken);
            return square is null ? Results.NotFound() : Results.Ok(new { square.Id, square.Description });
        });
        group.MapPut("/{squareId}/description", async (
            string squareId, DescriptionInput input, ApplicationDbContext db, CancellationToken cancellationToken) =>
        {
            if (input.Description is null || input.Description.Length > 280)
            {
                return Results.BadRequest("Description is required and limited to 280 characters.");
            }
            var square = await db.BingoSquares.SingleOrDefaultAsync(
                square => square.Id == squareId, cancellationToken);
            if (square is null)
            {
                return Results.NotFound();
            }
            square.Description = input.Description;
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(new { square.Id, square.Description });
        });
        return endpoints;
    }
}

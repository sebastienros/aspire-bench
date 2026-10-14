using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace BingoBoard.Data;

/// <summary>
/// Constructs <see cref="ApplicationDbContext"/> instances during design time.
/// </summary>
/// <remarks>
/// This class gets automatically discovered while running migrations.
/// Design-time tooling runs outside the application, so it cannot read the normal host
/// configuration. This factory uses the local workshop database connection.
/// </remarks>
public class DesignTimeApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    private const string DesignTimeDbConnectionString = "Host=localhost;Port=5432;Database=bingo;Username=postgres;Password=postgres";

    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var services = new ServiceCollection();
        services.AddDefaultIdentity();

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder
            .UseNpgsql(DesignTimeDbConnectionString)
            .UseApplicationServiceProvider(services.BuildServiceProvider());

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}

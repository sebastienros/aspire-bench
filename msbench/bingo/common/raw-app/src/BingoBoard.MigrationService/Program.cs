using BingoBoard.MigrationService;
using BingoBoard.Data;
using Microsoft.EntityFrameworkCore;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddHostedService<Worker>();

var databaseConnection = builder.Configuration.GetConnectionString("db")
    ?? throw new InvalidOperationException("Connection string 'db' is required.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(databaseConnection, npgsql => npgsql.EnableRetryOnFailure()));
builder.Services.AddDefaultIdentity();

var host = builder.Build();
host.Run();

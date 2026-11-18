using Microsoft.EntityFrameworkCore;
using Shop.Data;
using Shop.Worker;

var builder = Host.CreateApplicationBuilder(args);

var databaseConnection = builder.Configuration.GetConnectionString("shopdb")
    ?? throw new InvalidOperationException("Connection string 'shopdb' is required.");

builder.Services.AddDbContext<ShopDb>(options => options.UseSqlServer(databaseConnection));
builder.Services.AddHostedService<OrderConsumer>();

var host = builder.Build();
host.Run();

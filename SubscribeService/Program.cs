using Microsoft.EntityFrameworkCore;
using SubscribeDb;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContextFactory<SubscribeContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("SUBSCRIBE_DB_CONNECTION")));

var app = builder.Build();

app.Run();

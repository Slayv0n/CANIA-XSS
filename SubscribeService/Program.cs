using MassTransit;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using Subscribe_API.Consumers;
using Subscribe_API.Models.Requests;
using Subscribe_API.Services;
using SubscribeDb;
using SubscribeDb.Models;
using System;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContextFactory<SubscribeContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("SUBSCRIBE_DB_CONNECTION")));

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<UserDeletedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ReceiveEndpoint("user-deleted-subscribe-queue", e =>
        {
            e.ConfigureConsumer<UserDeletedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });
});

builder.Services.AddScoped<ISubscribeService, SubscribeService>();


var app = builder.Build();
// Инициализация базы с ожиданием (retry logic)
for (int i = 0; i < 10; i++) // 10 попыток
{
    try
    {
        using var scope = app.Services.CreateScope();
        var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<SubscribeContext>>();
        using var context = contextFactory.CreateDbContext();
        context.Database.EnsureCreated();
        Console.WriteLine("Database connected and created successfully!");
        break; // Если успешно — выходим из цикла
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database not ready yet... (Attempt {i + 1}/10)");
        Thread.Sleep(3000); // Ждем 3 секунды перед следующей попыткой
    }
}

app.MapPost("/subscribes/subscribe", async (ISubscribeService service, HttpContext context, Tariff tariff) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);

        if (!verify)
        {
            throw new AuthException("User");
        }

        var subscribe = await service.SubscribeAsync(userId, tariff);
        return Results.Ok(subscribe);
    }
    catch (AuthException)
    {
        return Results.Unauthorized();
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapPut("/subscribes/update", async (ISubscribeService service, HttpContext context, Tariff tariff) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);

        if (!verify)
        {
            throw new AuthException("User");
        }

        var subscribe = await service.UpdateAsync(userId, tariff);
        return Results.Ok(subscribe);
    }
    catch (NotFoundException ex)
    {
        return Results.NotFound(ex.Message);
    }
    catch (AuthException)
    {
        return Results.Unauthorized();
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapDelete("/subscribes/unscribe", async (ISubscribeService service, HttpContext context) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);

        if (!verify)
        {
            throw new AuthException("User");
        }

        await service.UnscribeAsync(userId);
        return Results.Ok();
    }
    catch (NotFoundException ex)
    {
        return Results.NotFound(ex.Message);
    }
    catch (AuthException)
    {
        return Results.Unauthorized();
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.Run();

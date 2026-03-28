using MassTransit;
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
        cfg.Host(Environment.GetEnvironmentVariable("RabbitMQ_Host") ?? "rabbitmq", "/", h => {
            h.Username("guest");
            h.Password("guest");
        });
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

// Инициализация БД
for (int i = 0; i < 10; i++)
{
    try {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<IDbContextFactory<SubscribeContext>>().CreateDbContext();
        dbContext.Database.EnsureCreated();
        Console.WriteLine("Subscribe DB READY!");
        break;
    } catch { 
        Thread.Sleep(3000); 
    }
}

// 1. Получить подписку (БЕЗ 404 ОШИБКИ)
app.MapGet("/subscribes/my", async (HttpContext context, IDbContextFactory<SubscribeContext> dbFactory) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);
        if (!verify) return Results.Unauthorized();

        using var db = await dbFactory.CreateDbContextAsync();
        var subscribe = await db.Subscribes
            .Include(s => s.Tariff)
            .FirstOrDefaultAsync(s => s.Id == userId && s.Status == SharedModels.General.Status.Active);

        // ВОТ ИСПРАВЛЕНИЕ: Возвращаем пустоту, а не 404
        if (subscribe == null) return Results.Ok((Tariff?)null); 
        
        return Results.Ok(subscribe.Tariff);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

// 2. Купить/Обновить подписку
app.MapPost("/subscribes/subscribe", async (ISubscribeService service, HttpContext context, Tariff tariff) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);
        if (!verify) return Results.Unauthorized();

        var subscribe = await service.SubscribeAsync(userId, tariff);
        return Results.Ok(subscribe);
    }
    catch (Exception ex) { return Results.BadRequest(ex.Message); }
});

// 3. Отменить подписку
app.MapDelete("/subscribes/unscribe", async (ISubscribeService service, HttpContext context) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);
        if (!verify) return Results.Unauthorized();

        await service.UnscribeAsync(userId);
        return Results.Ok();
    }
    catch (Exception ex) { return Results.BadRequest(ex.Message); }
});

app.Run();
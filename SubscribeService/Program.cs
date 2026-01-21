using MassTransit;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using Subscribe_API.Consumers;
using Subscribe_API.Models.Requests;
using Subscribe_API.Services;
using SubscribeDb;
using SubscribeDb.Models;

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

app.MapPost("/subscribes/subscribe/{id:guid}", async (ISubscribeService service, Guid id, Tariff tariff) =>
{
    try
    {
        var subscribe = await service.SubscribeAsync(id, tariff);
        return Results.Ok(subscribe);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapPut("/subscribes/update/{id:guid}", async (ISubscribeService service, Guid id, Tariff tariff) =>
{
    try
    {
        var subscribe = await service.UpdateAsync(id, tariff);
        return Results.Ok(subscribe);
    }
    catch (NotFoundException ex)
    {
        return Results.NotFound(ex.Message);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapDelete("/subscribes/unscribe/{id:guid}", async (ISubscribeService service, Guid id) =>
{
    try
    {
        await service.UnscribeAsync(id);
        return Results.Ok();
    }
    catch (NotFoundException ex)
    {
        return Results.NotFound(ex.Message);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.Run();

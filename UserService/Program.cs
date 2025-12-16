using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Internal;
using UserAPI.Service;
using SharedModels.Exceptions;
using UserAPI.Models.Requests;
using UserDb;
using MassTransit;
using UserAPI.Consumers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContextFactory<UserContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("USER_DB_CONNECTION")));

builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<PasswordCreatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ReceiveEndpoint("password-created-queue", e =>
        {
            e.ConfigureConsumer<PasswordCreatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });

});

var app = builder.Build();

app.MapPost("/users/create", async (IUserService userService, UserCreateRequest request) =>
{
    try
    {
        var user = await userService.CreateUser(request);
        return Results.Ok(user);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex);
    }   
});

app.MapGet("/users/{id::guid}", async (IUserService userService, Guid id) =>
{
    try
    {
        var user = await userService.GetUser(id);
        return Results.Ok(user);
    }
    catch (NotFoundException ex)
    {
        return Results.NotFound(ex);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex);
    }
});

app.Run();

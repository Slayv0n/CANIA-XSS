using Hangfire;
using Hangfire.PostgreSql;
using MassTransit;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Internal;
using SharedModels.Exceptions;
using SharedModels.General;
using UserAPI.Consumers;
using UserAPI.Models.Requests;
using UserAPI.Service;
using UserDb;
using UserDb.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContextFactory<UserContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("USER_DB_CONNECTION")));

builder.Services.AddHangfire(config =>
{
    config.UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(options =>
        {
            options.UseNpgsqlConnection(Environment.GetEnvironmentVariable("USER_DB_CONNECTION"));
        });
});

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = 1;
    options.Queues = new[] { "default" };
});

builder.Services.AddScoped<ICleanupService, CleanupService>();

builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<PasswordCreatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ReceiveEndpoint("password-created-user-queue", e =>
        {
            e.ConfigureConsumer<PasswordCreatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });

});

var app = builder.Build();

app.UseHangfireDashboard();

RecurringJob.AddOrUpdate<ICleanupService>(
    "cleanup-deleted-records",
    service => service.CleanupAsync(),
    Cron.Daily(),
    new RecurringJobOptions
    {
        TimeZone = TimeZoneInfo.Local
    });

app.MapHangfireDashboard();

app.MapPost("/users/create", async (IUserService userService, CreateRequest request) =>
{
    try
    {
        var user = await userService.CreateUserAsync(request);
        return Results.Ok(user);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }   
});

app.MapGet("/users/{id::guid}", async (IUserService userService, Guid id, string status = "") =>
{
    try
    {
        var user = await userService.GetUserAsync(id, status);
        return Results.Ok(user);
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
app.MapGet("/users/all", async (IUserService userService, string status = "") =>
{
    try
    {
        //Если будет 0, то обработайте на фронте
        var users = await userService.GetAllUsersAsync();
        return Results.Ok(users);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});
app.MapPut("/users/update/{id::guid}", async (IUserService userService, Guid id, UpdateRequest request) =>
{
    try
    {
        var user = await userService.UpdateUserAsync(id, request.Email);
        return Results.Ok(user);
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
app.MapDelete("/users/delete/{id::guid}", async (IUserService userService, Guid id) =>
{
    try
    {
        await userService.DeleteUserAsync(id);
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

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
using Hangfire;
using Hangfire.PostgreSql;
using SharedModels.General;

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
        var user = await userService.CreateUser(request);
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
        var user = await userService.GetUser(id, status);
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
        var users = await userService.GetAllUsers();
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
        var user = await userService.UpdateUser(id, request.Email);
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
        await userService.DeleteUser(id);
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

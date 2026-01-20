using Hangfire;
using Hangfire.PostgreSql;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Password_API.Consumers;
using Password_API.Models.Requests;
using Password_API.Services;
using PasswordDb;
using SharedModels.Exceptions;
using SharedModels.General;
using UserAPI.Service;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContextFactory<PasswordContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("PASSWORD_DB_CONNECTION")));

builder.Services.AddHangfire(config =>
{
    config.UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(options =>
        {
            options.UseNpgsqlConnection(Environment.GetEnvironmentVariable("PASSWORD_DB_CONNECTION"));
        });
});

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = 1;
    options.Queues = new[] { "default" };
});

builder.Services.AddScoped<ICleanupService, CleanupService>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<UserCreatedConsumer>();

    x.AddConsumer<UserDeletedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ReceiveEndpoint("user-created-password-queue", e =>
        {
            e.ConfigureConsumer<UserCreatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("user-deleted-password-queue", e =>
        {
            e.ConfigureConsumer<UserDeletedConsumer>(context);

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

app.MapPut("/passwords/update/{id::guid}",async (IPasswordService service, Guid id, UpdateRequest request) =>
{
    try
    {
        await service.Update(id, request.Password);
        return Results.Ok();
    }
    catch(NotFoundException ex)
    {
        return Results.NotFound(ex.Message);
    }
    catch(StatusException ex)
    {
        return Results.Conflict(ex.Message);
    }
    catch(Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.Run();

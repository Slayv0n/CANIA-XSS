using Hangfire;
using Hangfire.PostgreSql;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Password_API.Consumers;
using Password_API.Models.Requests;
using Password_API.Service;
using Password_API.Services;
using PasswordDb;
using SharedModels.Exceptions;
using SharedModels.General;
using System.ComponentModel.DataAnnotations;
using ValidationResult = System.ComponentModel.DataAnnotations.ValidationResult;

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

builder.Services.AddScoped<IPasswordService, PasswordService>();

builder.Services.AddScoped<IPasswordTokenService, PasswordTokenService>();

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

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<PasswordContext>();

    if (context.Database.GetPendingMigrations().Any())
    {
        context.Database.Migrate();
    }
}

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

app.MapPut("/passwords/update",async (IPasswordService service, HttpContext context, UpdateRequest request) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);

        if (!verify)
        {
            throw new AuthException("User");
        }

        var validationContext = new ValidationContext(request);
        var results = new List<ValidationResult>();

        if (!Validator.TryValidateObject(request, validationContext, results, validateAllProperties: true))
        {
            return Results.BadRequest(new
            {
                errors = results.Select(r => new
                {
                    field = string.Join(", ", r.MemberNames),
                    message = r.ErrorMessage
                })
            });
        }

        await service.UpdateAsync(userId, request.Password);
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

app.MapPost("/passwords/reset", async (IPasswordTokenService service, ResetRequest request) =>
{
    try
    {
        await service.CreateTokenAsync(request.Email);
        return Results.Ok();
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapPost("/passwords/reset/{token}/{address}",
    async (IPasswordTokenService service, string token, string address) =>
{
    try
    {
        return await service.VerifyTokenAsync(token, address) ? Results.Ok(true) : Results.BadRequest(false);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});


app.MapPost("/passwords/reset/complete", async (
    IPasswordTokenService tokenService, 
    IPasswordService passwordService,
    UpdateRequest request,
    string token, string address, Guid id) =>
{
    try
    {
        var validationContext = new ValidationContext(request);
        var results = new List<ValidationResult>();

        if (!Validator.TryValidateObject(request, validationContext, results, validateAllProperties: true))
        {
            return Results.BadRequest(new
            {
                errors = results.Select(r => new
                {
                    field = string.Join(", ", r.MemberNames),
                    message = r.ErrorMessage
                })
            });
        }

        var result = await tokenService.VerifyTokenAsync(token, address);

        if (!result) throw new NotFoundException("Entity not found");

        await passwordService.UpdateAsync(id, request.Password);

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

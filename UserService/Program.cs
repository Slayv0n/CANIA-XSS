using Hangfire;
using Hangfire.PostgreSql;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using SharedModels.General;
using System.ComponentModel.DataAnnotations;
using UserAPI.Consumers;
using UserAPI.Models.Requests;
using UserAPI.Service;
using UserDb;
using ValidationResult = System.ComponentModel.DataAnnotations.ValidationResult;

var builder = WebApplication.CreateBuilder(args);

var db = builder.Configuration.GetValue<string>("User_Db_Connection");
Console.WriteLine($"Connection String: {db ?? "NULL"}");

builder.Services.AddDbContextFactory<UserContext>(
    options => options.UseNpgsql(builder.Configuration.GetValue<string>("User_Db_Connection")));

builder.Services.AddHangfire(config =>
{
    config.UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(options =>
        {
            options.UseNpgsqlConnection(builder.Configuration.GetValue<string>("User_Db_Connection"));
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

    x.AddConsumer<UserSocialAccountCreatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(builder.Configuration.GetValue<string>("RabbitMQ_Host") ?? "localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        cfg.ReceiveEndpoint("password-user-queue", e =>
        {
            e.ConfigureConsumer<PasswordCreatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("user-social-account-user-queue", e =>
        {
            e.ConfigureConsumer<UserSocialAccountCreatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });

});

var app = builder.Build();
// пж оставь этот костыль мне нейронка пишет что 
// код быстрее бд компилируется и у меня ошибка появляется
for (int i = 0; i < 15; i++) // 15 попыток
{
    try {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<UserContext>();
        context.Database.Migrate(); // Миграция сама проверит, что нужно
        Console.WriteLine("DATABASE READY!");
        break;
    } catch {
        Console.WriteLine("Waiting for database...");
        Thread.Sleep(3000); // Ждем 3 секунды перед следующей попыткой
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


app.MapPost("/users/create", async (IUserService userService, CreateRequest request) =>
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

        var user = await userService.CreateUserAsync(request);
        return Results.Ok(user);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }   
});

app.MapGet("/users", async (IUserService userService, HttpContext context, string status = "") =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);

        if (!verify)
        {
            throw new AuthException("User");
        }

        var user = await userService.GetUserAsync(userId, status);
        return Results.Ok(user);
    }
    catch (NotFoundException ex)
    {
        return Results.NotFound(ex.Message);
    }
    catch(AuthException)
    {
        return Results.Unauthorized();
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
        var users = await userService.GetAllUsersAsync();
        return Results.Ok(users);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});
app.MapGet("/users/id/{email}", async (IUserService userService, string email) =>
{
    try
    {
        var id = await userService.GetUserIdAsync(email);
        if (id == Guid.Empty) throw new NotFoundException("User not found");
        return Results.Ok(id);
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
app.MapPut("/users/update", async (IUserService userService, HttpContext context, UpdateRequest request) =>
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

        var user = await userService.UpdateUserAsync(userId, request.Email);
        return Results.Ok(user);
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
app.MapDelete("/users/delete", async (IUserService userService, HttpContext context) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);

        if (!verify)
        {
            throw new AuthException("User");
        }

        await userService.DeleteUserAsync(userId);
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
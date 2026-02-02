using Auth_API.Consumers;
using Auth_API.Models.Requests;
using Auth_API.Models.Settings;
using Auth_API.Services;
using AuthDb;
using MassTransit;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContextFactory<AuthContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("AUTH_DB_CONNECTION")));

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
builder.Services.AddSingleton<JwtSettings>();

builder.Services.AddScoped<IJwtService, JwtService>();

builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<UserCreatedConsumer>();

    x.AddConsumer<UserUpdatedConsumer>();

    x.AddConsumer<UserDeletedConsumer>();

    x.AddConsumer<PasswordUpdatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ReceiveEndpoint("auth-users-queue", e =>
        {
            e.ConfigureConsumer<UserCreatedConsumer>(context);
            e.ConfigureConsumer<UserUpdatedConsumer>(context);
            e.ConfigureConsumer<UserDeletedConsumer>(context);
            
            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("auth-passwords-queue", e =>
        {
            e.ConfigureConsumer<PasswordUpdatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });
});

var app = builder.Build();

app.MapPost("/auth/login", async (LoginRequest request, IAuthenticationService authenticationService) =>
{
    try
    {
        var response = await authenticationService.LoginAsync(request.Email, request.Password);
        return Results.Ok(response);
    }
    catch (AuthException)
    {
        return Results.Unauthorized();
    }
    catch(Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapPost("/auth/refresh", async (TokenRequest request, IAuthenticationService authenticationService) =>
{
    try
    {
        var response = await authenticationService.RefreshAsync(request.Token);
        return Results.Ok(response);
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

app.MapPost("/auth/logout", async (TokenRequest request, IAuthenticationService authenticationService) =>
{
    try
    {
        await authenticationService.LogoutAsync(request.Token);
        return Results.Ok();
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

app.MapPost("/auth/logout/all", async (TokenRequest request, HttpContext context, IAuthenticationService authenticationService) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);

        if (!verify)
        {
            throw new AuthException("User");
        }

        await authenticationService.LogoutAllAsync(userId, request.Token);
        return Results.Ok();
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
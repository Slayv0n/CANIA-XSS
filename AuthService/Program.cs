using Auth_API.Consumers;
using Auth_API.Services;
using AuthDb;
using AuthDb.Models;
using MassTransit;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SharedModels.ProcessedEvents;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContextFactory<AuthContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("AUTH_DB_CONNECTION")));

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

app.Run();
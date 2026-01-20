using MassTransit;
using Microsoft.EntityFrameworkCore;
using Notification_API.Consumers;
using Notification_API.Service;
using NotificationDb;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContextFactory<NotificationContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("NOTIFICATION_DB_CONNECTION")));

builder.Services.AddScoped<INotificationServcie, EmailService>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<UserCreatedConsumer>();

    x.AddConsumer<UserUpdatedConsumer>();

    x.AddConsumer<PasswordTokenCreatedConsumer>();

    x.AddConsumer<PasswordResetConsumer>();

    x.AddConsumer<SubscribeOnConsumer>();

    x.AddConsumer<SubscribeOffConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ReceiveEndpoint("user-created-notification-queue", e =>
        {
            e.ConfigureConsumer<UserCreatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("user-updated-notification-queue", e =>
        {
            e.ConfigureConsumer<UserUpdatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("password-token-created-notification-queue", e =>
        {
            e.ConfigureConsumer<PasswordTokenCreatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("password-reset-notification-queue", e =>
        {
            e.ConfigureConsumer<PasswordResetConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("subscribe-on-notification-queue", e =>
        {
            e.ConfigureConsumer<SubscribeOnConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("subscribe-off-notification-queue", e =>
        {
            e.ConfigureConsumer<SubscribeOffConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });

});

var app = builder.Build();

app.Run();

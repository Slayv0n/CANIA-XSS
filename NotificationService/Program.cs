using MassTransit;
using Microsoft.EntityFrameworkCore;
using Notification_API.Consumers;
using Notification_API.Service;
using NotificationDb;
using SharedModels.ProcessedEvents;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContextFactory<NotificationContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("NOTIFICATION_DB_CONNECTION")));

builder.Services.AddScoped<INotificationServcie, EmailService>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<UserCreatedConsumer>();

    x.AddConsumer<UserUpdatedConsumer>();

    x.AddConsumer<PasswordTokenCreatedConsumer>();

    x.AddConsumer<PasswordUpdateConsumer>();

    x.AddConsumer<SubscribedConsumer>();

    x.AddConsumer<UnscribedConsumer>();

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

        cfg.ReceiveEndpoint("password-updated-notification-queue", e =>
        {
            e.ConfigureConsumer<PasswordUpdateConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("subscribe-on-notification-queue", e =>
        {
            e.ConfigureConsumer<SubscribedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("subscribe-off-notification-queue", e =>
        {
            e.ConfigureConsumer<UnscribedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });

});

var app = builder.Build();
// Инициализация базы с ожиданием (retry logic)
for (int i = 0; i < 10; i++) // 10 попыток
{
    try
    {
        using var scope = app.Services.CreateScope();
        var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<NotificationContext>>();
        using var context = contextFactory.CreateDbContext();
        context.Database.EnsureCreated();
        Console.WriteLine("Database connected and created successfully!");
        break; // Если успешно — выходим из цикла
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database not ready yet... (Attempt {i + 1}/10)");
        Thread.Sleep(3000); // Ждем 3 секунды перед следующей попыткой
    }
}

app.Run();

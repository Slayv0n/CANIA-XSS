using MassTransit;
using Microsoft.EntityFrameworkCore;
using Password_API.Consumers;
using PasswordDb;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<UserCreatedConsumer>();

builder.Services.AddDbContextFactory<PasswordContext>(
    options => options.UseNpgsql(Environment.GetEnvironmentVariable("PASSWORD_DB_CONNECTION")));

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<UserCreatedConsumer>();

    x.AddConsumer<UserDeletedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ReceiveEndpoint("user-created-queue", e =>
        {
            e.ConfigureConsumer<UserCreatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });

        cfg.ReceiveEndpoint("user-deleted-queue", e =>
        {
            e.ConfigureConsumer<UserDeletedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });

});

var app = builder.Build();

app.MapPut("/passwords/update/{id::guid}",async () =>
{

});

app.Run();

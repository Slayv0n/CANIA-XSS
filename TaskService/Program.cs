using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using SharedModels.General;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Task_API.Consumers;
using Task_API.Models.Request;
using Task_API.Services;
using TaskDb;

var builder = WebApplication.CreateBuilder(args);

// 1. Настройка базы данных через Factory
builder.Services.AddDbContextFactory<TaskContext>(
    options => options.UseNpgsql(builder.Configuration.GetValue<string>("TASK_DB_CONNECTION")));

builder.Services.AddScoped<ITaskService, TaskService>();

// 2. Настройка MassTransit (RabbitMQ)
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<TaskStatusUpdatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        // Указываем хост 'rabbitmq', как в docker-compose
        cfg.Host(Environment.GetEnvironmentVariable("RabbitMQ_Host") ?? "rabbitmq", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        cfg.ReceiveEndpoint("task-status-queue", e =>
        {
            e.ConfigureConsumer<TaskStatusUpdatedConsumer>(context);
            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });
});

var app = builder.Build();

// 3. КОСТЫЛЬ: Ожидание запуска базы данных (чтобы не было 502 ошибки)
for (int i = 0; i < 10; i++)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<TaskContext>>();
        using var context = contextFactory.CreateDbContext();
        context.Database.EnsureCreated();
        Console.WriteLine(">>>> TASK DATABASE IS READY!");
        break;
    }
    catch (Exception)
    {
        Console.WriteLine($">>>> Waiting for Postgres... Attempt {i + 1}/10");
        Thread.Sleep(3000);
    }
}

app.UseStaticFiles();

// --- ЭНДПОИНТЫ ---

// Создать новую задачу
app.MapPost("/task/create", async (CreateRequest request, HttpContext context, ITaskService taskService) => 
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);
        if (!verify) return Results.Unauthorized();

        var task = await taskService.CreateAsync(userId, request.Host, request.TypeOfAttacks, request.Depth);
        return Results.Ok(task);
    }
    catch (Exception ex) { return Results.BadRequest(ex.Message); }
});

// Получить список всех задач (для Профиля)
app.MapGet("/task/all", async (HttpContext context, IDbContextFactory<TaskContext> dbFactory) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);
        if (!verify) return Results.Unauthorized();

        using var db = await dbFactory.CreateDbContextAsync();
        var tasks = await db.Tasks
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedTime)
            .ToListAsync();

        return Results.Ok(tasks);
    }
    catch (Exception ex) { return Results.BadRequest(ex.Message); }
});

// Получить статус конкретной задачи
app.MapGet("/task/{taskId:Guid}", async (Guid taskId, ITaskService taskService) =>
{
    try
    {
        var task = await taskService.GetAsync(taskId);
        return Results.Ok(task);
    }
    catch (Exception ex) { return Results.NotFound(ex.Message); }
});

// Живое обновление через SSE
app.MapGet("/task/connection/{taskId:Guid}", (Guid taskId, ITaskService taskService, CancellationToken cancellationToken) =>
{
    try
    {
        return TypedResults.ServerSentEvents(taskService.GetUpdateTaskAsync(taskId, cancellationToken), eventType: "task");
    }
    catch (Exception ex) { return Results.BadRequest(ex.Message); }
});

// Удалить задачу (Крестик в профиле)
app.MapDelete("/task/cancel/{taskId:Guid}", async (Guid taskId, ITaskService taskService) =>
{
    try
    {
        await taskService.CancellAsync(taskId);
        return Results.Ok();
    }
    catch (Exception ex) { return Results.BadRequest(ex.Message); }
});

app.Run();
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using System;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Threading;
using Task_API.Consumers;
using Task_API.Models.Request;
using Task_API.Services;
using TaskDb;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContextFactory<TaskContext>(
    options => options.UseNpgsql(builder.Configuration.GetValue<string>("TASK_DB_CONNECTION")));

builder.Services.AddScoped<ITaskService, TaskService>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<TaskStatusUpdatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ReceiveEndpoint("task-status-queue", e =>
        {
            e.ConfigureConsumer<TaskStatusUpdatedConsumer>(context);

            e.PrefetchCount = 10;
            e.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        });
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<TaskContext>>();
    using var context = contextFactory.CreateDbContext();
    context.Database.EnsureCreated();
}

app.UseStaticFiles();

app.MapPost("/task/create", async (CreateRequest request, HttpContext context, ITaskService taskService) => 
{
    try
    {
        // 1. Достаем твой ID из заголовка, который заботливо подложил Gateway
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);

        if (!verify)
        {
            return Results.Unauthorized();
        }

        // 2. Создаем задачу именно для твоего userId
        var task = await taskService.CreateAsync(userId, request.Host, request.TypeOfAttacks, request.Depth);
        return Results.Ok(task);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapGet("/task/{taskId:Guid}", async (Guid taskId, ITaskService taskService) =>
{
    try
    {
        var task = await taskService.GetAsync(taskId);
        return Results.Ok(task);
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

app.MapGet("/task/connection/{taskId:Guid}", (Guid taskId, ITaskService taskService, 
    CancellationToken cancellationToken,
    HttpContext context) =>
{
    try
    {
        return TypedResults
        .ServerSentEvents(taskService.GetUpdateTaskAsync(taskId, cancellationToken),
        eventType: "task");
    }
    catch(TaskCanceledException)
    {
        return Results.Ok("Connection closed");
    }
    catch(NotFoundException ex)
    {
        return Results.NotFound(ex.Message);
    }
    catch(Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.MapDelete("/task/cancel/{taskId:Guid}", async (Guid taskId, ITaskService taskService) =>
{
    try
    {
        await taskService.CancellAsync(taskId);
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


app.MapGet("/task/all", async (HttpContext context, IDbContextFactory<TaskDb.TaskContext> dbFactory) =>
{
    try
    {
        // 1. Узнаем, кто запрашивает
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);
        if (!verify) return Results.Unauthorized();

        // 2. Достаем из базы все задачи этого пользователя, сортируем от новых к старым
        using var db = await dbFactory.CreateDbContextAsync();
        var tasks = await db.Tasks
            .Where(t => t.UserId == userId && t.Status != SharedModels.General.StatusTask.Cancelled) 
            .OrderByDescending(t => t.CreatedTime)
            .ToListAsync();

        return Results.Ok(tasks);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(ex.Message);
    }
});

app.Run();

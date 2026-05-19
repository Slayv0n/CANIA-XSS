using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using System.ComponentModel.DataAnnotations;
using Task_API.Consumers;
using Task_API.Models.Request;
using Task_API.Services;
using TaskDb;
using ValidationResult = System.ComponentModel.DataAnnotations.ValidationResult;
using Microsoft.AspNetCore.Mvc;


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
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<TaskContext>();

    if (context.Database.GetPendingMigrations().Any())
    {
        context.Database.Migrate();
    }
}

app.MapPost("/task/create", async (HttpContext context, CreateRequest request, ITaskService taskService) =>
{
    try
    {
        // ВАЖНО: Берем реальный ID пользователя из заголовка X-User-Id
        if (!Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId))
        {
            return Results.Unauthorized();
        }

        var validationContext = new ValidationContext(request);
        var results = new List<ValidationResult>();

        if (!Validator.TryValidateObject(request, validationContext, results, validateAllProperties: true))
        {
            return Results.BadRequest(new { errors = results });
        }

        // Передаем userId вместо Guid.NewGuid()
        var task = await taskService.CreateAsync(userId, request.Host, request.TypeOfAttacks, request.Depth);
        return Results.Ok(task);
    }
    catch
    {
        return Results.BadRequest();
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
    catch (TaskCanceledException)
    {
        return Results.Ok("Connection closed");
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

// Этот эндпоинт будет дергать наш Python-скрипт!
app.MapPut("/task/{taskId:Guid}/report", async (Guid taskId, [FromBody] Task_API.Models.Request.ReportRequest request, ITaskService taskService) =>
{
    try
    {
        await taskService.UpdateReportAsync(taskId, request.ReportContent);
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

app.MapGet("/task/all", async (ITaskService taskService, HttpContext context) =>
{
    try
    {
        bool verify = Guid.TryParse(context.Request.Headers["X-User-Id"].ToString(), out Guid userId);

        if (!verify)
        {
            throw new AuthException("User");
        }

        var tasks = await taskService.GetUserTasksAsync(userId);
        return Results.Ok(tasks);
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
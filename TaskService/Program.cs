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

app.UseStaticFiles();

app.MapPost("/task/create", async (CreateRequest request, ITaskService taskService) => 
{
    try
    {
        var task = await taskService.CreateAsync(Guid.NewGuid(), request.Host, request.TypeOfAttacks, request.Depth);
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


app.Run();

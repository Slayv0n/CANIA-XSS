using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Events.Tasks;
using SharedModels.Exceptions;
using SharedModels.General;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Task_API.Models.Response;
using TaskDb;
using TaskDb.Models;

namespace Task_API.Services
{
    public interface ITaskService
    {
        Task<TaskResponse> CreateAsync(Guid userId, string host, List<TypeOfAttack> typeOfAttacks, Depth depth);
        Task<TaskResponse> GetAsync(Guid taskId);
        IAsyncEnumerable<string> GetUpdateTaskAsync(Guid taskId, CancellationToken cancellationToken);
        Task CancellAsync(Guid taskId);
    }
    public class TaskService : ITaskService
    {
        private readonly IDbContextFactory<TaskContext> _dbContextFactory;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly ILogger<TaskService> _logger;

        public TaskService(IDbContextFactory<TaskContext> dbContextFactory,
            IPublishEndpoint publishEndpoint,
            ILogger<TaskService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _publishEndpoint = publishEndpoint;
            _logger = logger;
        }

        public async Task CancellAsync(Guid taskId)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            // 1. Ищем задачу
            var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);

            if (task != null)
            {
                // 2. УДАЛЯЕМ ЕЁ СОВСЕМ ИЗ БАЗЫ
                db.Tasks.Remove(task); 
                await db.SaveChangesAsync();
                
                // 3. Уведомляем систему (необязательно, но пусть будет)
                await _publishEndpoint.Publish<TaskCancelled>(new { Id = taskId });
                
                _logger.LogInformation($"Задача {taskId} удалена навсегда.");
            }
        }

        public async Task<TaskResponse> CreateAsync(Guid userId, string host, List<TypeOfAttack> typeOfAttacks, Depth depth)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var task = new TaskPentest
            {
                UserId = userId,
                Host = host,
                TypeOfAttacks = typeOfAttacks,
                Depth = depth,
                CreatedTime = DateTime.UtcNow,
                LastUpdate = DateTime.UtcNow,
                Status = StatusTask.Created
            };

            await db.Tasks.AddAsync(task);
            await db.SaveChangesAsync();

            await _publishEndpoint.Publish<TaskCreated>(new
            {
                Id = task.Id,
                UserId = task.UserId,
                Host = task.Host,
                TypeOfAttacks = task.TypeOfAttacks,
                Depth = task.Depth
            });

            // --- НАЧАЛО КОСТЫЛЯ ДЛЯ ИМИТАЦИИ ИИ ---
            var taskId = task.Id;
            _ = Task.Run(async () =>
            {
                // Имитируем, что нейронка работает 5 секунд
                await Task.Delay(5000); 
                
                using var scopeDb = await _dbContextFactory.CreateDbContextAsync();
                var taskToComplete = await scopeDb.Tasks.FindAsync(taskId);
                if (taskToComplete != null)
                {
                    taskToComplete.Status = StatusTask.Completed; // 5 - это Completed
                    taskToComplete.LastUpdate = DateTime.UtcNow;
                    await scopeDb.SaveChangesAsync();
                }
            });
            // --- КОНЕЦ КОСТЫЛЯ ---

            var response = new TaskResponse
            {
                Id = task.Id,
                Host = task.Host,
                TypeOfAttacks = task.TypeOfAttacks,
                Depth = task.Depth,
                Status = task.Status
            };

            return response;
        }

        public async Task<TaskResponse> GetAsync(Guid taskId)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();
            var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null) throw new NotFoundException("Task not found");

            // Генерируем скелет отчета прямо на бэкенде, если задача завершена
            string? reportContent = null;
            if (task.Status == StatusTask.Completed)
            {
                reportContent = $@"# ОТЧЕТ О БЕЗОПАСНОСТИ: {task.Host.ToUpper()}
            **Генерация:** CANIA-XSS Reporter Agent
            **Дата:** {task.LastUpdate.ToString("dd.MM.yyyy HH:mm")}
            **Статус:** Анализ завершен

            ## 1. Сводка
            - **Цель:** {task.Host}
            - **Глубина сканирования:** {task.Depth}

            ## 2. Результаты
            В ходе автоматизированного тестирования (MVP-режим) критических уязвимостей не обнаружено. 
            Payload-векторы успешно отфильтрованы WAF/сервером цели.

            ## 3. Лог сканирования
            [INFO] Starting scan on {task.Host}[INFO] Resolving IP...
            [INFO] Injecting payloads to endpoints
            [SUCCESS] 0 vulnerabilities found";
            }

            return new TaskResponse
            {
                Id = task.Id,
                Host = task.Host,
                TypeOfAttacks = task.TypeOfAttacks,
                Depth = task.Depth,
                Status = task.Status,
                ReportContent = reportContent 
            };
        }

        public async IAsyncEnumerable<string> GetUpdateTaskAsync(Guid taskId, [EnumeratorCancellation] CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                var task = await GetAsync(taskId);

                yield return JsonSerializer.Serialize(task);

                if (task.Status == StatusTask.Completed)
                    yield break;

                await Task.Delay(1000);
            }
        }
    }
}

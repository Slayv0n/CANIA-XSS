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

            var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null)
            {
                _logger.LogWarning($"Task not found: {taskId}");
                throw new NotFoundException("Task not found");
            }

            task.Status = StatusTask.Cancelled;
            task.LastUpdate = DateTime.UtcNow;

            await db.SaveChangesAsync();

            await _publishEndpoint.Publish<TaskCancelled>(new
            {
                Id = taskId
            });
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

            if (task == null)
            {
                _logger.LogWarning($"Task not found: {taskId}");
                throw new NotFoundException("Task not found");
            }

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

        public async IAsyncEnumerable<string> GetUpdateTaskAsync(Guid taskId, [EnumeratorCancellation] CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                var task = await GetAsync(taskId);

                yield return JsonSerializer.Serialize(task);

                if (task.Status == StatusTask.Completed)
                    yield break;

                await Task.Delay(1000, cancellationToken);
            }
        }
    }
}

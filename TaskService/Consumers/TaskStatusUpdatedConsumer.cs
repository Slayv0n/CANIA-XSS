using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Events.Tasks;
using SharedModels.Exceptions;
using System.Threading.Tasks;
using TaskDb;

namespace Task_API.Consumers
{
    public class TaskStatusUpdatedConsumer : IConsumer<TaskStatusUpdated>
    {
        private readonly IDbContextFactory<TaskContext> _dbContextFactory;
        private readonly ILogger<TaskStatusUpdatedConsumer> _logger;

        public TaskStatusUpdatedConsumer(IDbContextFactory<TaskContext> dbContextFactory, ILogger<TaskStatusUpdatedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<TaskStatusUpdated> context)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == context.Message.Id);

            if (task == null)
            {
                _logger.LogWarning($"Task not found: {context.Message.Id}");
                throw new NotFoundException("Task not found");
            }

            task.Status = context.Message.Status;
            await db.SaveChangesAsync();
        }
    }
}

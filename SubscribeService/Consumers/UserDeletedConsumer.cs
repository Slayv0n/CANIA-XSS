using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using SharedModels.General;
using SharedModels.Passwords;
using SharedModels.ProcessedEvents;
using SharedModels.Users;
using SubscribeDb;

namespace Subscribe_API.Consumers
{
    public class UserDeletedConsumer : IConsumer<UserDeleted>
    {
        private readonly IDbContextFactory<SubscribeContext> _dbContextFactory;
        private readonly ILogger<UserDeletedConsumer> _logger;

        public UserDeletedConsumer(
            IDbContextFactory<SubscribeContext> dbContextFactory,
            ILogger<UserDeletedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<UserDeleted> context)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var processedEvent = new ProcessedEvent()
            {
                Id = context.MessageId ?? Guid.Empty,
                Type = this.GetType().Name.Replace("Consumer", ""),
                RegistrationTime = DateTime.UtcNow,
            };

            var check = await ProcessedEventsCheker.CheckRegistrationAsync(db, processedEvent);

            if (check)
            {
                _logger.LogWarning($"Event {context.MessageId} already started");
                return;
            }

            var subscribe = await db.Subscribes.FirstOrDefaultAsync(s => s.Id == context.Message.Id);

            if (subscribe == null)
            {
                _logger.LogWarning($"Subscribe not found: {context.Message.Id}");
                throw new NotFoundException("Subscribe not found");
            }

            subscribe.Version++;
            subscribe.Status = Status.Deleted;

            _logger.LogInformation($"Subscribe deleted: {subscribe.Id}");
            await db.SaveChangesAsync();
        }
    }
}

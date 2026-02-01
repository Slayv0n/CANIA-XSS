using AuthDb;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Events.Users;
using SharedModels.Exceptions;
using SharedModels.General;
using SharedModels.ProcessedEvents;

namespace Auth_API.Consumers
{
    public class UserDeletedConsumer : IConsumer<UserDeleted>
    {
        private readonly IDbContextFactory<AuthContext> _dbContextFactory;
        private readonly ILogger<UserDeletedConsumer> _logger;
        private readonly IProcessedEventChecker _processedEventChecker;

        public UserDeletedConsumer(IDbContextFactory<AuthContext> dbContextFactory,
            ILogger<UserDeletedConsumer> logger,
            IProcessedEventChecker processedEventChecker)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
            _processedEventChecker = processedEventChecker;
        }

        public async Task Consume(ConsumeContext<UserDeleted> context)
        {
            _logger.LogInformation($"{this.GetType()} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var processedEvent = new ProcessedEvent()
            {
                Id = context.MessageId ?? Guid.Empty,
                Type = this.GetType().Name.Replace("Consumer", ""),
                RegistrationTime = DateTime.UtcNow,
            };

            var check = await _processedEventChecker.CheckRegistrationAsync(processedEvent);

            if (check)
            {
                _logger.LogWarning($"Event {context.MessageId} already started");
                return;
            }

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == context.Message.Id);

            if (user == null)
            {
                _logger.LogWarning($"User not found {context.Message.Id}");
                throw new NotFoundException("User not found");
            }

            user.Status = Status.Deleted;
            user.LastUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();
        }
    }
}

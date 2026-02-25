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

        public UserDeletedConsumer(IDbContextFactory<AuthContext> dbContextFactory,
            ILogger<UserDeletedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<UserDeleted> context)
        {
            _logger.LogInformation($"{this.GetType()} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == context.Message.Id);

            if (user == null)
            {
                _logger.LogWarning($"User not found {context.Message.Id}");
                throw new NotFoundException("User not found");
            }

            user.Status = Status.Deleted;
            user.LastUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();

            _logger.LogInformation($"{this.GetType()} ended at {DateTime.UtcNow}");
        }
    }
}

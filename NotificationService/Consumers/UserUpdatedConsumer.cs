using MassTransit;
using Microsoft.EntityFrameworkCore;
using NotificationDb;
using SharedModels.Exceptions;
using SharedModels.Users;

namespace Notification_API.Consumers
{
    public class UserUpdatedConsumer : IConsumer<UserUpdated>
    {
        private readonly IDbContextFactory<NotificationContext> _dbContextFactory;
        private readonly ILogger<UserCreatedConsumer> _logger;

        public UserUpdatedConsumer(IDbContextFactory<NotificationContext> dbContextFactory,
            ILogger<UserCreatedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<UserUpdated> context)
        {
            _logger.LogInformation($"User updated {context.Message.Id} start at {DateTime.UtcNow}");
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == context.Message.Id);

            if (user == null)
            {
                _logger.LogWarning($"User not found {context.Message.Id}");
                throw new NotFoundException("User not found");
            }

            user.Id = context.Message.Id;
            user.Email = context.Message.Email;
            user.Status = context.Message.Status;

            await db.SaveChangesAsync();
        }
    }
}

using AuthDb;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Events.Users;
using SharedModels.Exceptions;
using SharedModels.General;
using SharedModels.ProcessedEvents;

namespace Auth_API.Consumers
{
    public class UserUpdatedConsumer : IConsumer<UserUpdated>
    {
        private readonly IDbContextFactory<AuthContext> _dbContextFactory;
        private readonly ILogger<UserUpdatedConsumer> _logger;

        public UserUpdatedConsumer(IDbContextFactory<AuthContext> dbContextFactory,
            ILogger<UserUpdatedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<UserUpdated> context)
        {
            _logger.LogInformation($"{this.GetType()} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == context.Message.Id);

            if (user == null)
            {
                _logger.LogWarning($"User not found {context.Message.Id}");
                throw new NotFoundException("User not found");
            }

            user.Email = context.Message.Email;
            user.Status = context.Message.Status;
            user.LastUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();
        }
    }
}

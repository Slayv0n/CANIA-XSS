using AuthDb;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Events.Passwords;
using SharedModels.Exceptions;
using SharedModels.General;
using SharedModels.ProcessedEvents;

namespace Auth_API.Consumers
{
    public class PasswordUpdatedConsumer : IConsumer<PasswordUpdated>
    {
        private readonly IDbContextFactory<AuthContext> _dbContextFactory;
        private readonly ILogger<PasswordUpdatedConsumer> _logger;
        private readonly IProcessedEventChecker _processedEventChecker;

        public PasswordUpdatedConsumer(IDbContextFactory<AuthContext> dbContextFactory,
            ILogger<PasswordUpdatedConsumer> logger,
            IProcessedEventChecker processedEventChecker)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
            _processedEventChecker = processedEventChecker;
        }

        public async Task Consume(ConsumeContext<PasswordUpdated> context)
        {
            _logger.LogInformation($"{this.GetType()} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == context.Message.Id);

            if (user == null)
            {
                _logger.LogWarning($"User not found {context.Message.Id}");
                throw new NotFoundException("User not found");
            }

            user.PasswordHash = context.Message.PasswordHash;
            user.LastUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();
        }
    }
}

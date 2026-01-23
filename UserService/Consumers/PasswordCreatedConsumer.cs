using MassTransit;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using SharedModels.General;
using SharedModels.Passwords;
using SharedModels.ProcessedEvents;
using SharedModels.Users;
using UserDb;

namespace UserAPI.Consumers
{
    public class PasswordCreatedConsumer : IConsumer<PasswordCreated>
    {
        private readonly IDbContextFactory<UserContext> _dbContextFactory;
        private readonly ILogger<PasswordCreatedConsumer> _logger;

        public PasswordCreatedConsumer(
            IDbContextFactory<UserContext> dbContextFactory,
            ILogger<PasswordCreatedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<PasswordCreated> context)
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

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == context.Message.Id);

            if (user == null)
            {
                _logger.LogWarning($"User not found: {context.Message.Id}");
                throw new NotFoundException("User not found");
            }

            user.Status = Status.Active;

            _logger.LogInformation($"User registration success {user.Id}");
            await db.SaveChangesAsync();

        }
    }
}

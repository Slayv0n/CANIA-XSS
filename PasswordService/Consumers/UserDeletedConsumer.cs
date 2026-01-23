using MassTransit;
using Microsoft.EntityFrameworkCore;
using PasswordDb;
using PasswordDb.Models;
using SharedModels.Exceptions;
using SharedModels.General;
using SharedModels.Passwords;
using SharedModels.ProcessedEvents;
using SharedModels.Users;

namespace Password_API.Consumers
{
    public class UserDeletedConsumer : IConsumer<UserDeleted>
    {
        private readonly IDbContextFactory<PasswordContext> _dbContextFactory;
        private readonly ILogger<UserDeletedConsumer> _logger;

        public UserDeletedConsumer(
            IDbContextFactory<PasswordContext> dbContextFactory,
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

            var password = await db.Passwords.FirstOrDefaultAsync(p => p.Id == context.Message.Id);

            if (password == null)
            {
                _logger.LogWarning($"Password not found: {context.Message.Id}");
                throw new NotFoundException("Password not found");
            }

            password.Version++;
            password.LastUpdate = DateTime.UtcNow;
            password.Status = Status.Deleted;

            _logger.LogInformation($"Password deleted: {password.Id}");
            await db.SaveChangesAsync();
        }
    }
}

using MassTransit;
using Microsoft.EntityFrameworkCore;
using PasswordDb;
using PasswordDb.Models;
using SharedModels.Events.Users;
using SharedModels.Exceptions;
using SharedModels.General;
using SharedModels.Events.Passwords;
using SharedModels.ProcessedEvents;

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
            _logger.LogInformation($"{this.GetType()} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();



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

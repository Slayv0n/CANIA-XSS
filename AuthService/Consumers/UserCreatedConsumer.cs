using AuthDb;
using AuthDb.Models;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Events.Users;
using SharedModels.General;
using SharedModels.ProcessedEvents;

namespace Auth_API.Consumers
{
    public class UserCreatedConsumer : IConsumer<UserCreated>
    {
        private readonly IDbContextFactory<AuthContext> _dbContextFactory;
        private readonly ILogger<UserCreatedConsumer> _logger;

        public UserCreatedConsumer(IDbContextFactory<AuthContext> dbContextFactory,
            ILogger<UserCreatedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<UserCreated> context)
        {
            _logger.LogInformation($"{this.GetType()} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var usaVerify = await db.UserSocialAccounts.AnyAsync(usa => usa.UserId == context.Message.Id);

            if (usaVerify)
            {
                return;
            }

            var user = new User()
            {
                Id = context.Message.Id,
                Email = context.Message.Email,
                PasswordHash = context.Message.PasswordHash,
                Status = context.Message.Status,
                LastUpdated = DateTime.UtcNow
            };

            await db.Users.AddAsync(user);
            await db.SaveChangesAsync();
        }
    }
}

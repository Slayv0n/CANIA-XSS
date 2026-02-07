using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Events.Users;
using UserDb;
using UserDb.Models;

namespace UserAPI.Consumers
{
    public class UserSocialAccountCreatedConsumer : IConsumer<UserSocialAccountCreated>
    {
        private readonly IDbContextFactory<UserContext> _dbContextFactory;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly ILogger<UserSocialAccountCreatedConsumer> _logger;

        public UserSocialAccountCreatedConsumer(IDbContextFactory<UserContext> dbContextFactory,
            IPublishEndpoint publishEndpoint,
            ILogger<UserSocialAccountCreatedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _publishEndpoint = publishEndpoint;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<UserSocialAccountCreated> context)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var user = new User
            {
                Id = context.Message.Id,
                Email = context.Message.Email,
                Status = context.Message.Status,
            };

            await db.Users.AddAsync(user);
            await db.SaveChangesAsync();

            await _publishEndpoint.Publish<UserCreated>(new
            {
                Id = user.Id,
                Email = user.Email,
                Status = user.Status
            });
        }
    }
}

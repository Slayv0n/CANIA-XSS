using MassTransit;
using Microsoft.EntityFrameworkCore;
using PasswordDb;
using PasswordDb.Models;
using SharedModels.Users;
using System.Text.Json;
using SharedModels.Exceptions;
using SharedModels.Passwords;
using SharedModels.General;

namespace Password_API.Consumers
{
    public class UserCreatedConsumer : IConsumer<UserCreated>
    {
        private readonly IDbContextFactory<PasswordContext> _dbContextFactory;
        private readonly ILogger<UserCreatedConsumer> _logger;

        public UserCreatedConsumer(
            IDbContextFactory<PasswordContext> dbContextFactory,
            ILogger<UserCreatedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<UserCreated> context)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var password = new Password
            {
                Id = context.Message.Id,
                HashPassword = PasswordHasher.HashPassword(context.Message.Password),
                Status = Status.Active
            };

            _logger.LogInformation($"Пароль создан {password.Id}");
            await db.Passwords.AddAsync(password);
            await db.SaveChangesAsync();

            await context.Publish<PasswordCreated>(new {Id = password.Id});
        }
    }
}

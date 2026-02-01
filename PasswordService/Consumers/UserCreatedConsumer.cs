using MassTransit;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PasswordDb;
using PasswordDb.Models;
using SharedModels.Events.Passwords;
using SharedModels.Events.Users;
using SharedModels.Exceptions;
using SharedModels.General;
using SharedModels.ProcessedEvents;
using System.Text.Json;

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
            _logger.LogInformation($"{this.GetType()} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var password = new Password
            {
                Id = context.Message.Id,
                PasswordHash = context.Message.PasswordHash,
                Status = Status.Active
            };

            _logger.LogInformation($"Password created {password.Id} at {DateTime.UtcNow}");
            await db.Passwords.AddAsync(password);
            await db.SaveChangesAsync();

            await context.Publish<PasswordCreated>(new 
            {
                Id = password.Id,
                PasswordHash = password.PasswordHash
            });
        }
    }
}

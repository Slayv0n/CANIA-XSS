using MassTransit;
using Microsoft.EntityFrameworkCore;
using PasswordDb;
using PasswordDb.Models;
using SharedModels.Users;
using System.Text.Json;
using SharedModels.Exceptions;

namespace Password_API
{
    public class UserCreatedConsumer : IConsumer<UserCreated>
    {
        private readonly IDbContextFactory<PasswordContext> _dbFactory;

        public UserCreatedConsumer(IDbContextFactory<PasswordContext> dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public async Task Consume(ConsumeContext<UserCreated> context)
        {
            using var db = await _dbFactory.CreateDbContextAsync();

            var password = new Password
            {
                HashPassword = PasswordHasher.HashPassword(context.Message.Password)
            };

            await db.Passwords.AddAsync(password);
            await db.SaveChangesAsync();
        }
    }
}

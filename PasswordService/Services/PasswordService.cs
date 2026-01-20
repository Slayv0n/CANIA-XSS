using MassTransit;
using MassTransit.Initializers;
using Microsoft.EntityFrameworkCore;
using PasswordDb;
using SharedModels.Exceptions;
using SharedModels.General;
using SharedModels.Passwords;

namespace Password_API.Services
{
    public interface IPasswordService
    {
        Task Update(Guid id, string newPassword);
        Task<bool> Verify(Guid id, string password);
    }
    public class PasswordService : IPasswordService
    {
        private readonly IDbContextFactory<PasswordContext> _dbContextFactory;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly ILogger<PasswordService> _logger;
        public PasswordService(IDbContextFactory<PasswordContext> dbContextFactory,
            IPublishEndpoint publishEndpoint,
            ILogger<PasswordService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _publishEndpoint = publishEndpoint;
            _logger = logger;
        }

        public async Task Update(Guid id, string newPassword)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var password = await db.Passwords.FirstOrDefaultAsync(p => p.Id == id);

            if (password == null)
            {
                _logger.LogWarning($"Password not found {id}");
                throw new NotFoundException("Password not found");
            }

            if (password.Status != Status.Active)
            {
                _logger.LogWarning($"Invalid status for update {password.Status}");
                throw new StatusException("Invalid status for update");
            }

            var passwordHash = PasswordHasher.HashPassword(newPassword);
            password.HashPassword = passwordHash;
            password.LastUpdate = DateTime.UtcNow;

            await db.SaveChangesAsync();

            await _publishEndpoint.Publish<PasswordUpdated>(new
            {
                Id = id
            });
        }

        public async Task<bool> Verify(Guid id, string password)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var passwordHash = await db.Passwords.FirstOrDefaultAsync(p => p.Id == id)
                .Select(p => (p != null ? p.HashPassword : null));

            if (passwordHash == null)
            {
                _logger.LogWarning($"Password not found {id}");
                throw new NotFoundException("Password not found");
            }

            return PasswordHasher.VerifyPassword(password, passwordHash);
        }
    }
}

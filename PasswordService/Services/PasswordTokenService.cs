using Microsoft.EntityFrameworkCore;
using PasswordDb;
using PasswordDb.Models;

namespace Password_API.Services
{
    public interface IPasswordTokenService
    {
        Task<PasswordToken> CreateTokenAsync();
        Task<bool> VerifyTokenAsync(string token);
    }
    public class PasswordTokenService : IPasswordTokenService
    {
        private readonly IDbContextFactory<PasswordContext> _dbContextFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PasswordTokenService> _logger;
        public PasswordTokenService(IDbContextFactory<PasswordContext> dbContextFactory, IConfiguration configuration, ILogger<PasswordTokenService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<PasswordToken> CreateTokenAsync()
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var token = new PasswordToken()
            {
                Token = Guid.NewGuid().ToString(),
                CreateTime = DateTime.UtcNow,
                ExpireTime = DateTime.UtcNow.AddMinutes(_configuration.GetValue<int>("Token:ExpiredMinutes")),
            };

            await db.Tokens.AddAsync(token);
            await db.SaveChangesAsync();

            return token;
        }

        public async Task<bool> VerifyTokenAsync(string token)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var tokenDb = await db.Tokens.Where(t => t.Token == token && t.ExpireTime > DateTime.UtcNow)
                .FirstOrDefaultAsync();

            return tokenDb != null;
        }
    }
}

using MassTransit;
using Microsoft.EntityFrameworkCore;
using PasswordDb;
using PasswordDb.Models;
using SharedModels.Passwords;

namespace Password_API.Services
{
    public interface IPasswordTokenService
    {
        Task<PasswordToken> CreateTokenAsync(string address);
        Task<bool> VerifyTokenAsync(string token, string address);
    }
    public class PasswordTokenService : IPasswordTokenService
    {
        private readonly IDbContextFactory<PasswordContext> _dbContextFactory;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PasswordTokenService> _logger;
        public PasswordTokenService(IDbContextFactory<PasswordContext> dbContextFactory,
            IPublishEndpoint publishEndpoint,
            IConfiguration configuration,
            ILogger<PasswordTokenService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _publishEndpoint = publishEndpoint;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<PasswordToken> CreateTokenAsync(string address)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var token = new PasswordToken()
            {
                Email = address,
                Token = Guid.NewGuid().ToString(),
                CreateTime = DateTime.UtcNow,
                ExpiredTime = DateTime.UtcNow.AddMinutes(_configuration.GetValue<int>("Token:ExpiredMinutes")),
            };

            await db.Tokens.AddAsync(token);
            await db.SaveChangesAsync();

            await _publishEndpoint.Publish<PasswordTokenCreated>(new
            {
                MessageAddress = address, 
                Token = token.Token
            });

            return token;
        }

        public async Task<bool> VerifyTokenAsync(string token, string address)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var tokenDb = await db.Tokens.Where(t => t.Token == token && t.Email == address && t.ExpiredTime > DateTime.UtcNow)
                .FirstOrDefaultAsync();

            return tokenDb != null;
        }
    }
}

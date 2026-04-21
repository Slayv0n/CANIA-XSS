using Auth_API.Models.Responses;
using AuthDb;
using AuthDb.Models;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Events.Users;
using SharedModels.General;
using System.Reflection;
using System.Security.Claims;

namespace Auth_API.Services
{
    public interface ISocialAuthenticationService
    {
        public Task<LoginResponse> LoginAsync(ClaimsPrincipal claimsPrincipal);
    }
    public class SocialAuthenticationService : ISocialAuthenticationService
    {
        private readonly IDbContextFactory<AuthContext> _dbContextFactory;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly IJwtService _jwtService;
        private readonly ILogger<SocialAuthenticationService> _logger;

        public SocialAuthenticationService(IDbContextFactory<AuthContext> dbContextFactory,
            IPublishEndpoint publishEndpoint,
            IJwtService jwtService,
            ILogger<SocialAuthenticationService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _publishEndpoint = publishEndpoint;
            _jwtService = jwtService;
            _logger = logger;
        }

        public async Task<LoginResponse> LoginAsync(ClaimsPrincipal claimsPrincipal)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var provider = claimsPrincipal.FindFirstValue("provider");
            var providerId = claimsPrincipal.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = claimsPrincipal.FindFirstValue(ClaimTypes.Email);
                
            if (string.IsNullOrEmpty(provider) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(providerId))
            {
                throw new InvalidOperationException("Электронная почта обязательна");
            }

            var socialAccount = await db.UserSocialAccounts
                .Include(usa => usa.User)
                .FirstOrDefaultAsync(usa =>
                    usa.Provider == provider && usa.ProviderUserId == providerId);

            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (socialAccount == null)
            {
                if (user == null)
                {
                    user = new User
                    {
                        Email = email.ToLower().Trim(),
                        PasswordHash = null,
                        Status = Status.Active,
                        LastUpdated = DateTime.UtcNow,
                    };

                    await db.Users.AddAsync(user);
                    await db.SaveChangesAsync();

                    await _publishEndpoint.Publish<UserSocialAccountCreated>(new
                    {
                        Id = user.Id,
                        Email = user.Email,
                        Status = Status.Active,
                    });
                }

                socialAccount = new UserSocialAccount
                {
                    UserId = user.Id,
                    Provider = provider,
                    ProviderUserId = providerId,
                    LastLoginAt = DateTime.UtcNow
                };

                await db.UserSocialAccounts.AddAsync(socialAccount);
            }
            else
            {
                user = socialAccount.User;
                socialAccount.LastLoginAt = DateTime.UtcNow;            
            }

            await db.SaveChangesAsync();

            var tokens = await Task.WhenAll(
                Task.Run(() => _jwtService.GenerateAccessToken(user.Id)),
                _jwtService.GenerateRefreshTokenAsync(user.Id));

            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} ended at {DateTime.UtcNow}");

            return new LoginResponse()
            {
                UserId = user.Id,
                AccessToken = tokens[0],
                RefreshToken = tokens[1]
            };
        }
    }
}

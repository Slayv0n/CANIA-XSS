using Auth_API.Models.Responses;
using AuthDb;
using AuthDb.Models;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Events.Users;
using SharedModels.General;
using System.Security.Claims;

namespace Auth_API.Services
{
    public interface ISocialAuthenticationService
    {
        public Task<LoginResponse> Login(ClaimsPrincipal claimsPrincipal);
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

        public async Task<LoginResponse> Login(ClaimsPrincipal claimsPrincipal)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var googleId = claimsPrincipal.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = claimsPrincipal.FindFirstValue(ClaimTypes.Email);
                
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(googleId))
            {
                throw new InvalidOperationException("Email is required");
            }

            var socialAccount = await db.UserSocialAccounts
                .Include(usa => usa.User)
                .FirstOrDefaultAsync(usa =>
                    usa.Provider == "google" && usa.ProviderUserId == googleId);

            User user;

            if (socialAccount == null)
            {
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = email.ToLower().Trim(),
                    PasswordHash = null,
                    Status = Status.Active,
                    LastUpdated = DateTime.UtcNow,
                };

                await db.Users.AddAsync(user);
                await db.SaveChangesAsync();

                socialAccount = new UserSocialAccount
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Provider = "google",
                    ProviderUserId = googleId,
                    LastLoginAt = DateTime.UtcNow
                };

                await db.UserSocialAccounts.AddAsync(socialAccount);
                await db.SaveChangesAsync();

                await _publishEndpoint.Publish<UserSocialAccountCreated>(new
                {
                    Id = user.Id,
                    Email = user.Email,
                    Status = Status.Active,
                });
            }
            else
            {
                user = socialAccount.User;
                socialAccount.LastLoginAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }

            var accessToken = _jwtService.GenerateAccessToken(user.Id);
            var refreshToken = await _jwtService.GenerateRefreshTokenAsync(user.Id);

            return new LoginResponse()
            {
                UserId = user.Id,
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };
        }
    }
}

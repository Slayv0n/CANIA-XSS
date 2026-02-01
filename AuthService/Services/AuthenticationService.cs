using Auth_API.Models.Responses;
using AuthDb;
using AuthDb.Models;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using SharedModels.Hash;

namespace Auth_API.Services
{
    public interface IAuthenticationService
    {
        Task<LoginResponse> LoginAsync(string email, string password);
        Task<LoginResponse> RefreshAsync(Guid userId, string token);
        Task LogoutAsync(string token);
        Task LogoutAllAsync(Guid userId);
    }
    public class AuthenticationService : IAuthenticationService
    {
        private readonly IDbContextFactory<AuthContext> _dbContextFactory;
        private readonly IJwtService _jwtService;
        private readonly ILogger<AuthenticationService> _logger;

        public AuthenticationService(IDbContextFactory<AuthContext> dbContextFactory, 
            IJwtService jwtService,
            ILogger<AuthenticationService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _jwtService = jwtService;
            _logger = logger;
        }

        public async Task<LoginResponse> LoginAsync(string email, string password)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                _logger.LogWarning($"User not found {email}");
                throw new LoginException("Email or password incorrect");
            }

            if (!PasswordHasher.VerifyPassword(password, user.PasswordHash))
            {
                _logger.LogWarning($"Password incorrect");
                throw new LoginException("Email or password incorrect");
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

        public async Task LogoutAllAsync(Guid userId)
        {
            await _jwtService.RevokeAllRefreshTokenAsync(userId);
        }

        public async Task LogoutAsync(string token)
        {
            await _jwtService.RevokeRefreshTokenAsync(token);
        }

        public async Task<LoginResponse> RefreshAsync(Guid userId, string token)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var verify = await _jwtService.VerifyRefreshTokenAsync(token);

            if (!verify)
            {
                _logger.LogWarning($"Token incorrect {token}");
                throw new TokenException("Token incorrect");
            }

            var accessToken = _jwtService.GenerateAccessToken(userId);
            var refreshToken = await _jwtService.GenerateRefreshTokenAsync(userId);

            await _jwtService.RevokeRefreshTokenAsync(token);

            return new LoginResponse()
            {
                UserId = userId,
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };
        }
    }
}

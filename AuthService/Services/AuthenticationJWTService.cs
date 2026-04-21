using Auth_API.Models.Responses;
using AuthDb;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using SharedModels.Hash;
using System.Reflection;

namespace Auth_API.Services
{
    public interface IAuthenticationJWTService
    {
        Task<LoginResponse> LoginAsync(string email, string password);
        Task<LoginResponse> RefreshAsync(string token);
        Task LogoutAsync(string token);
        Task LogoutAllAsync(Guid userId, string token);
    }
    public class AuthenticationJWTService : IAuthenticationJWTService
    {
        private readonly IDbContextFactory<AuthContext> _dbContextFactory;
        private readonly IJwtService _jwtService;
        private readonly ILogger<AuthenticationJWTService> _logger;

        public AuthenticationJWTService(IDbContextFactory<AuthContext> dbContextFactory, 
            IJwtService jwtService,
            ILogger<AuthenticationJWTService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _jwtService = jwtService;
            _logger = logger;
        }

        public async Task<LoginResponse> LoginAsync(string email, string password)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                _logger.LogWarning($"User not found {email}");
                throw new AuthException("Неверные данные");
            }

            if (user.PasswordHash == null)
            {
                _logger.LogWarning($"User logged in through third-party services");
                throw new AuthException("Пользователь вошёл с помощью сторонних сервисов и не установил пароль");
            }

            if (!PasswordHasher.VerifyPassword(password, user.PasswordHash))
            {
                _logger.LogWarning($"Password incorrect");
                throw new AuthException("Неверные данные");
            }

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

        public async Task LogoutAllAsync(Guid userId, string token)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            var verify = await _jwtService.VerifyRefreshTokenAsync(token);

            if (!verify)
            {
                _logger.LogWarning($"Token incorrect {token}");
                throw new AuthException("Недействительный токен");
            }

            await _jwtService.RevokeAllRefreshTokenAsync(userId);

            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} ended at {DateTime.UtcNow}");
        }

        public async Task LogoutAsync(string token)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            var verify = await _jwtService.VerifyRefreshTokenAsync(token);

            if (!verify)
            {
                _logger.LogWarning($"Token incorrect {token}");
                throw new AuthException("Недействительный токен");
            }

            await _jwtService.RevokeRefreshTokenAsync(token);

            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} ended at {DateTime.UtcNow}");
        }

        public async Task<LoginResponse> RefreshAsync(string token)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            var verify = await _jwtService.VerifyRefreshTokenAsync(token);

            if (!verify)
            {
                _logger.LogWarning($"Token incorrect {token}");
                throw new AuthException("Недействительный токен");
            }

            var userId = await _jwtService.GetUserIdAsync(token);

            var revokeTask = _jwtService.RevokeRefreshTokenAsync(token);

            var tokens = await Task.WhenAll(
                Task.Run(() => _jwtService.GenerateAccessToken(userId)),
                _jwtService.GenerateRefreshTokenAsync(userId));

            await revokeTask;

            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} ended at {DateTime.UtcNow}");

            return new LoginResponse()
            {
                UserId = userId,
                AccessToken = tokens[0],
                RefreshToken = tokens[1]
            };
        }
    }
}

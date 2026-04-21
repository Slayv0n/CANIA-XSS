using Auth_API.Models.Settings;
using AuthDb;
using AuthDb.Models;
using MassTransit.Initializers;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SharedModels.Exceptions;
using SharedModels.General;
using System.IdentityModel.Tokens.Jwt;
using System.Reflection;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Auth_API.Services
{
    public interface IJwtService
    {
        string GenerateAccessToken(Guid userId);
        Task<string> GenerateRefreshTokenAsync(Guid userId);
        Task<bool> VerifyRefreshTokenAsync(string token);
        Task RevokeRefreshTokenAsync(string token);
        Task RevokeAllRefreshTokenAsync(Guid userId);
        Task<Guid> GetUserIdAsync(string token);
    }
    public class JwtService : IJwtService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly IDbContextFactory<AuthContext> _dbContextFactory;
        private readonly ILogger<JwtService> _logger;

        public JwtService(JwtSettings jwtSettings,
            IDbContextFactory<AuthContext> dbContextFactory,
            ILogger<JwtService> logger)
        {
            _jwtSettings = jwtSettings; 
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }

        public string GenerateAccessToken(Guid userId)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtSettings.SecretKey);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationAccessTokenMinutes),
                Issuer = _jwtSettings.Issuer,
                Audience = _jwtSettings.Audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} ended at {DateTime.UtcNow}");

            return tokenHandler.WriteToken(token);
        }

        public async Task<string> GenerateRefreshTokenAsync(Guid userId)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

            var refreshTokenRecord = new RefreshToken
            {
                UserId = userId,
                TokenHash = ComputeSha256Hash(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.ExpirationRefreshTokenDays),
                Status = Status.Active
            };

            await db.RefreshTokens.AddAsync(refreshTokenRecord);
            await db.SaveChangesAsync();

            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} ended at {DateTime.UtcNow}");

            return refreshToken;
        }

        public async Task<Guid> GetUserIdAsync(string token)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var tokenHash = ComputeSha256Hash(token);

            var userId = await db.RefreshTokens.AsNoTracking()
                .FirstOrDefaultAsync(r => r.TokenHash == tokenHash && r.ExpiresAt > DateTime.UtcNow)
                .Select(r => r != null ? r.UserId : Guid.Empty);

            if (userId == Guid.Empty)
            {
                _logger.LogWarning($"Token invalid {token}");
                throw new AuthException($"Недействительный токен");
            }

            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} ended at {DateTime.UtcNow}");

            return userId;
        }

        public async Task RevokeAllRefreshTokenAsync(Guid userId)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var tokens = await db.RefreshTokens.Where(r => r.UserId == userId).ToListAsync<RefreshToken>();

            foreach (var token in tokens)
            {
                token.Status = Status.Deleted;
            }

            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} ended at {DateTime.UtcNow}");

            await db.SaveChangesAsync();
        }

        public async Task RevokeRefreshTokenAsync(string token)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var tokenHash = ComputeSha256Hash(token);

            var refreshToken = await db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == tokenHash);

            if (refreshToken == null)
            {
                _logger.LogWarning($"Token not found: {token}");
                throw new NotFoundException("Недействительный токен");
            }

            refreshToken.Status = Status.Deleted;

            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} ended at {DateTime.UtcNow}");

            await db.SaveChangesAsync();
        }

        public async Task<bool> VerifyRefreshTokenAsync(string token)
        {
            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var tokenHash = ComputeSha256Hash(token);

            var refreshToken = await db.RefreshTokens.AsNoTracking()
                .FirstOrDefaultAsync(r => r.TokenHash == tokenHash && r.ExpiresAt > DateTime.UtcNow);

            _logger.LogInformation($"{MethodBase.GetCurrentMethod()?.Name} ended at {DateTime.UtcNow}");

            return refreshToken != null;
        }

        private static string ComputeSha256Hash(string input)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToBase64String(bytes);
        }
    }
}

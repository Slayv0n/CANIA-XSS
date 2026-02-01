using Auth_API.Models.Settings;
using AuthDb;
using AuthDb.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SharedModels.Exceptions;
using SharedModels.General;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Auth_API.Services
{
    public interface IJwtService
    {
        string GenerateAccessToken(Guid userId);
        Task<string> GenerateRefreshToken(Guid userId);
        Task<bool> VerifyRefreshToken(string token);
        Task RevokeRefreshToken(string token);
        Task RevokeAllRefreshToken(Guid userId);
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
            return tokenHandler.WriteToken(token);
        }

        public async Task<string> GenerateRefreshToken(Guid userId)
        {
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

            return refreshToken;
        }

        public async Task RevokeAllRefreshToken(Guid userId)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var tokens = await db.RefreshTokens.Where(r => r.UserId == userId).ToListAsync<RefreshToken>();

            foreach (var token in tokens)
            {
                token.Status = Status.Deleted;
            }

            await db.SaveChangesAsync();
        }

        public async Task RevokeRefreshToken(string token)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var tokenHash = ComputeSha256Hash(token);

            var refreshToken = await db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == tokenHash);

            if (refreshToken == null)
            {
                _logger.LogWarning($"Token not found: {token}");
                throw new NotFoundException("Token not found");
            }

            refreshToken.Status = Status.Deleted;

            await db.SaveChangesAsync();
        }

        public async Task<bool> VerifyRefreshToken(string token)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var tokenHash = ComputeSha256Hash(token);

            var refreshToken = await db.RefreshTokens
                .FirstOrDefaultAsync(r => r.TokenHash == tokenHash && r.ExpiresAt < DateTime.UtcNow);

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

using Auth_API.Models.Settings;

namespace Auth_API.Services
{
    public interface IJwtService
    {
        Task<string> GenerateAccessToken(Guid userId);
        Task<string> GenerateRefreshToken(Guid userId);
        Task<bool> VerifyAccessToken(string token);
        Task<bool> VerifyRefreshToken(string token);
        Task RevokeRefreshToken(string token);
    }
    public class JwtService : IJwtService
    {
        private readonly JwtSettings _jwtSettings;

        public JwtService(JwtSettings jwtSettings)
        {
            _jwtSettings = jwtSettings; 
        }

        public Task<string> GenerateAccessToken(Guid userId)
        {
            throw new NotImplementedException();
        }

        public Task<string> GenerateRefreshToken(Guid userId)
        {
            throw new NotImplementedException();
        }

        public Task RevokeRefreshToken(string token)
        {
            throw new NotImplementedException();
        }

        public Task<bool> VerifyAccessToken(string token)
        {
            throw new NotImplementedException();
        }

        public Task<bool> VerifyRefreshToken(string token)
        {
            throw new NotImplementedException();
        }
    }
}

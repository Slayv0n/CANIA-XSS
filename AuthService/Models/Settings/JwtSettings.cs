namespace Auth_API.Models.Settings
{
    public class JwtSettings
    {
        public required string SecretKey { get; init; }
        public required string Issuer { get; init; }
        public required string Audience { get; init; }
        public double ExpirationAccessTokenMinutes { get; init; }
        public double ExpirationRefreshTokenDays { get; init; }
    }
}

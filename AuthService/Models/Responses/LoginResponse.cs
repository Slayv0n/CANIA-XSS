namespace Auth_API.Models.Responses
{
    public class LoginResponse
    {
        public Guid UserId { get; set; }
        public required string AccessToken { get; set; }
        public required string RefreshToken { get; set; }
    }
}

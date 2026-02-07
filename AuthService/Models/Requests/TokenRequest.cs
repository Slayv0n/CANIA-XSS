namespace Auth_API.Models.Requests
{
    public class TokenRequest
    {
        public required string RefreshToken { get; set; }
    }
}

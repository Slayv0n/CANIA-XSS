using System.Text.Json.Serialization;

namespace Auth_API.Models.Responses
{
    public class GoogleTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }
        [JsonPropertyName("token_type")]
        public string? TokenType { get; set; }
        [JsonPropertyName("scope")]
        public string? Scope { get; set; }
    }

    public class GoogleUserResponse
    {
        public string? Id { get; set; }
        public string? Email { get; set; }
    }
}

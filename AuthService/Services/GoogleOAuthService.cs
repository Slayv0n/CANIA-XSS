using Auth_API.Models.Responses;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Web;

namespace Auth_API.Services
{
    public interface IGoogleOAuthService
    {
        Task<string> GetAuthorizationUrl();
        Task<GoogleTokenResponse> ExchangeCodeForToken(string code);
        Task<GoogleUserResponse> GetUserInfo(string accessToken);
    }
    public class GoogleOAuthService : IGoogleOAuthService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GoogleOAuthService> _logger;
        private readonly string _clientId;
        private readonly string _clientSecret;
        private readonly string _redirectUri;

        public GoogleOAuthService(HttpClient httpClient, IConfiguration config, ILogger<GoogleOAuthService> logger)
        {
            _httpClient = httpClient;
            _clientId = config["Google_ClientId"]
                ?? throw new InvalidOperationException("Google ClientId required");
            _clientSecret = config["Google_SecretKey"]
                ?? throw new InvalidOperationException("Google ClientSecret required");
            _redirectUri = "http://localhost:8080/api/auth/google/callback";
            _logger = logger;
        }

        public Task<string> GetAuthorizationUrl()
        {
            var state = Guid.NewGuid().ToString("N");

            var url = "https://accounts.google.com/o/oauth2/v2/auth?" +
                $"client_id={_clientId}&" +
                $"redirect_uri={Uri.EscapeDataString(_redirectUri)}&" +
                $"response_type=code&" +
                $"scope={Uri.EscapeDataString("openid profile email")}&" +
                $"state={state}&" +
                $"access_type=offline&" +
                $"prompt=select_account";

            return Task.FromResult(url);
        }

        public async Task<GoogleTokenResponse> ExchangeCodeForToken(string code)
        {
            var response = await _httpClient.PostAsync(
                "https://oauth2.googleapis.com/token",
                new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["client_id"] = _clientId,
                    ["client_secret"] = _clientSecret,
                    ["code"] = code,
                    ["redirect_uri"] = _redirectUri,
                    ["grant_type"] = "authorization_code"
                }));

            response.EnsureSuccessStatusCode();

            var token = await response.Content.ReadFromJsonAsync<GoogleTokenResponse>();

            if (token?.AccessToken == null)
                throw new InvalidOperationException("Failed to parse Google token response");

            return token;
        }

        public async Task<GoogleUserResponse> GetUserInfo(string accessToken)
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.GetFromJsonAsync<GoogleUserResponse>(
                "https://www.googleapis.com/oauth2/v2/userinfo");

            return response ?? throw new InvalidOperationException("Failed to get Google user info");
        }
    }
}

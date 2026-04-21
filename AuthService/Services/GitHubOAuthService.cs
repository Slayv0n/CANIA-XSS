using Auth_API.Models.Responses;
using System.Net.Http.Headers;
using System.Web;

namespace Auth_API.Services
{
    public interface IGitHubOAuthService
    {
        Task<string> GetAuthorizationUrl();
        Task<GitHubTokenResponse> ExchangeCodeForToken(string code);
        Task<GitHubUserResponse> GetUserInfo(string accessToken);
        Task<List<GitHubEmailResponse>> GetUserEmails(string accessToken);
    }
    public class GitHubOAuthService : IGitHubOAuthService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GitHubOAuthService> _logger;
        private readonly string _clientId;
        private readonly string _clientSecret;
        private readonly string _redirectUri;

        public GitHubOAuthService(
            HttpClient httpClient,
            ILogger<GitHubOAuthService> logger,
            IConfiguration config)
        {
            _httpClient = httpClient;
            _logger = logger;
            _clientId = config["GitHub_ClientId"]
                ?? throw new InvalidOperationException("GitHub_ClientId required");
            _clientSecret = config["GitHub_SecretKey"]
                ?? throw new InvalidOperationException("GitHub_SecretKey required");
            _redirectUri = "http://localhost:8080/api/auth/github/callback"; //config["GitHub_RedirectUri"]
                //?? throw new InvalidOperationException("GitHub_RedirectUri required");
        }

        public Task<string> GetAuthorizationUrl()
        {
            var state = Guid.NewGuid().ToString("N");

            var url = "https://github.com/login/oauth/authorize?" +
                $"client_id={_clientId}&" +
                $"redirect_uri={Uri.EscapeDataString(_redirectUri)}&" +
                $"scope={Uri.EscapeDataString("user:email read:user")}&" +
                $"state={state}";

            return Task.FromResult(url);
        }

        public async Task<GitHubTokenResponse> ExchangeCodeForToken(string code)
        {
            var response = await _httpClient.PostAsync(
                "https://github.com/login/oauth/access_token",
                new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["client_id"] = _clientId,
                    ["client_secret"] = _clientSecret,
                    ["code"] = code,
                    ["redirect_uri"] = _redirectUri
                }));

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var parsed = HttpUtility.ParseQueryString(content);

            _logger.LogInformation(parsed["access_token"] + " " + parsed["token_type"] + " " + parsed["scope"]);

            return new GitHubTokenResponse
            {
                AccessToken = parsed["access_token"],
                TokenType = parsed["token_type"],
                Scope = parsed["scope"]
            };
        }

        public async Task<GitHubUserResponse> GetUserInfo(string accessToken)
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);
            _httpClient.DefaultRequestHeaders.Add("Accept", "application/vnd.github+json");
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Cania-XSS");

            var response = await _httpClient.GetFromJsonAsync<GitHubUserResponse>(
                "https://api.github.com/user");

            return response ?? throw new InvalidOperationException("Failed to get GitHub user info");
        }

        public async Task<List<GitHubEmailResponse>> GetUserEmails(string accessToken)
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);
            _httpClient.DefaultRequestHeaders.Add("Accept", "application/vnd.github+json");
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Cania-XSS");

            var response = await _httpClient.GetFromJsonAsync<List<GitHubEmailResponse>>(
                "https://api.github.com/user/emails");

            return response ?? new();
        }
    }
}

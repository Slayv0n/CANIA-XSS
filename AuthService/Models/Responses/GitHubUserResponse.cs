namespace Auth_API.Models.Responses
{
    // Models/Auth/GitHubAuth.cs
    public class GitHubTokenResponse
    {
        public string? AccessToken { get; set; }
        public string? TokenType { get; set; }
        public string? Scope { get; set; }
    }

    public class GitHubUserResponse
    {
        public long Id { get; set; }
        public string? Login { get; set; }
        public string? Email { get; set; }
        public string? PublicEmail { get; set; }
    }

    public class GitHubEmailResponse
    {
        public string? Email { get; set; }
        public bool Primary { get; set; }
        public bool Verified { get; set; }
        public string? Visibility { get; set; }
    }
}

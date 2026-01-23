using Auth_API.Models.Responses;

namespace Auth_API.Services
{
    public interface IAuthenticationService
    {
        Task<LoginResponse> LoginAsync(string username, string password);
        Task<LoginResponse> RefreshAsync(string token);
        Task LogoutAsync(string token);
    }
    public class AuthenticationService
    {
    
    }
}

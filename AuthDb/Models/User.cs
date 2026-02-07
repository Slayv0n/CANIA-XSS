using Microsoft.AspNetCore.Identity;
using SharedModels.General;
using System.ComponentModel.DataAnnotations;

namespace AuthDb.Models
{
    public class User
    {
        public Guid Id { get; init; }
        [EmailAddress]
        [StringLength(255, MinimumLength = 6, ErrorMessage = "Недопустимая длина Email")]
        public required string Email { get; set; }
        [StringLength(1024)]
        public string? PasswordHash { get; set; }
        public Status Status { get; set; }
        public DateTime LastUpdated {  get; set; } = DateTime.UtcNow;

        public List<RefreshToken> RefreshTokens { get; set; } =  new();
        public List<UserSocialAccount> UserSocialAccounts { get; set; } = new();
    }
}

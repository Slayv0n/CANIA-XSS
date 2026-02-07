using SharedModels.General;
using System.ComponentModel.DataAnnotations;

namespace AuthDb.Models
{
    public class UserSocialAccount
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        [StringLength(32)]
        public required string Provider { get; set; }
        [StringLength(255)]
        public required string ProviderUserId { get; set; }
        public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
        public Status Status { get; set; }

        public User User { get; set; } = null!;
    }
}

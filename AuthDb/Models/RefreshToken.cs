using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthDb.Models
{
    public class RefreshToken
    {
        public Guid Id { get; init; }
        public Guid UserId { get; init; }
        [StringLength(1024)]
        public required string TokenHash { get; set; }
        public DateTime ExpiresAt { get; set; }

        public User? User { get; set; }
    }
}

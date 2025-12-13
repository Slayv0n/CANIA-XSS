using System.ComponentModel.DataAnnotations;

namespace UserDb.Models
{
    public class User
    {
        public Guid Id { get; set; }
        [StringLength(255, MinimumLength = 6, ErrorMessage = "Недопустимая длина Email")]
        public required string Email { get; set; }
        [StringLength(32)]
        public string Status { get; set; } = "NotActive";
        public int Version { get; set; } = 0;
    }
}

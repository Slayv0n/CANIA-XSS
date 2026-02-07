using System.ComponentModel.DataAnnotations;

namespace PasswordDb.Models
{
    public class PasswordToken
    {
        public Guid Id { get; set; }
        [StringLength(255, MinimumLength = 6, ErrorMessage = "Недопустимая длина Email")]
        public required string Email { get; set; }
        [StringLength(1024)]
        public required string Token { get; set; }
        public DateTime CreateTime { get; set; } = DateTime.UtcNow;
        public DateTime ExpiredTime { get; set; }
    }
}

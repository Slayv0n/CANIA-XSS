using SharedModels.General;
using System.ComponentModel.DataAnnotations;

namespace UserDb.Models
{
    public class User
    {
        public Guid Id { get; set; }
        [StringLength(255, MinimumLength = 6, ErrorMessage = "Недопустимая длина Email")]
        public required string Email { get; set; }
        public Status Status { get; set; }
        public int Version { get; set; }
    }
}

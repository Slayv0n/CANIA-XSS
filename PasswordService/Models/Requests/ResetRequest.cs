using System.ComponentModel.DataAnnotations;

namespace Password_API.Models.Requests
{
    public class ResetRequest
    {
        [EmailAddress]
        [StringLength(255, MinimumLength = 6, ErrorMessage = "Недопустимая длина Email")]
        public required string Email { get; set; }
    }
}

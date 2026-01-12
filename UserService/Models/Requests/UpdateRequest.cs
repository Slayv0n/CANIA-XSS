using System.ComponentModel.DataAnnotations;

namespace UserAPI.Models.Requests
{
    public class UpdateRequest
    {
        [EmailAddress]
        [StringLength(255, MinimumLength = 6, ErrorMessage = "Недопустимая длина Email")]
        public required string Email { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace PasswordDb.Models
{
    public class Password
    {
        public Guid Id { get; set; }
        [StringLength(512)]
        public required string HashPassword { get; set; }
        public DateTime LastUpdate = DateTime.Now;
        public string Status { get; set; } = "NotActive";
        public int Version { get; set; } = 0;
    }
}

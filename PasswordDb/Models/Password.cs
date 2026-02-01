using SharedModels.General;
using System.ComponentModel.DataAnnotations;

namespace PasswordDb.Models
{
    public class Password
    {
        public Guid Id { get; set; }
        [StringLength(512)]
        public required string PasswordHash { get; set; }
        public DateTime LastUpdate = DateTime.UtcNow;
        public Status Status { get; set; }
        public int Version { get; set; }
    }
}

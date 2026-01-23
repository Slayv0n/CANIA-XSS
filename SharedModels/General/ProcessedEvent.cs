using System.ComponentModel.DataAnnotations;

namespace SharedModels.General
{
    public class ProcessedEvent
    {
        public Guid Id { get; set; }
        [StringLength(128)]
        public required string Type { get; set; }
        public DateTime RegistrationTime { get; set; } = DateTime.UtcNow;
    }
}

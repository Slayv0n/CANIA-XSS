using Microsoft.EntityFrameworkCore;
using SharedModels.General;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace SharedModels.ProcessedEvents
{
    public class ProcessedEventContext : DbContext
    {
        public ProcessedEventContext(DbContextOptions<ProcessedEventContext> options) : base(options) { }
        public DbSet<ProcessedEvent> ProcessedEvents { get; set; }
    }
}

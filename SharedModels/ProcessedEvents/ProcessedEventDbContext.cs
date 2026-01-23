using Microsoft.EntityFrameworkCore;
using SharedModels.General;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace SharedModels.ProcessedEvents
{
    public abstract class ProcessedEventDbContext<TDbContext> : DbContext where TDbContext : DbContext
    {
        public ProcessedEventDbContext(DbContextOptions<TDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<ProcessedEvent>(entity =>
            {
                entity.ToTable("ProcessedEvents");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).IsRequired();
                entity.HasIndex(e => e.Id).IsUnique();
                entity.Property(e => e.Type);
                entity.Property(e => e.RegistrationTime);
            });
        }
    }
}

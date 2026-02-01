using AuthDb.Models;
using Microsoft.EntityFrameworkCore;
using SharedModels.ProcessedEvents;

namespace AuthDb
{
    public class AuthContext : DbContext
    {
        public AuthContext(DbContextOptions<AuthContext> options) : base(options) { }
        public DbSet<User> Users { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<RefreshToken>(e =>
            {
                e.HasOne<User>(r => r.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

                e.Property(rt => rt.TokenHash).IsRequired();
                e.HasIndex(rt => rt.UserId);
            });
        }
    }
}

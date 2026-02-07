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
        public DbSet<UserSocialAccount> UserSocialAccounts { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<RefreshToken>(e =>
            {
                e.HasOne<User>(rt => rt.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

                e.Property(rt => rt.TokenHash).IsRequired();
                e.HasIndex(rt => rt.UserId);
            });

            modelBuilder.Entity<UserSocialAccount>(e =>
            {
                e.HasOne<User>(usa => usa.User)
                .WithMany(u => u.UserSocialAccounts)
                .HasForeignKey(usa => usa.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();
            });
        }
    }
}

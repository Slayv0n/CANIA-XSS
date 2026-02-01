using Microsoft.EntityFrameworkCore;
using PasswordDb.Models;
using SharedModels.General;
using SharedModels.ProcessedEvents;

namespace PasswordDb
{
    public class PasswordContext : DbContext
    {
        public PasswordContext(DbContextOptions<PasswordContext> o) : base(o) { }
        public DbSet<Password> Passwords { get; set; }
        public DbSet<PasswordToken> Tokens { get; set; }
    }
}

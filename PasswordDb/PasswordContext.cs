using Microsoft.EntityFrameworkCore;
using PasswordDb.Models;

namespace PasswordDb
{
    public class PasswordContext : DbContext
    {
        public PasswordContext(DbContextOptions<PasswordContext> o) : base(o) { }
        public DbSet<Password> Passwords { get; set; }
    }
}

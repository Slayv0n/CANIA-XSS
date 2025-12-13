using Microsoft.EntityFrameworkCore;
using UserDb.Models;

namespace UserDb
{
    public class UserContext : DbContext
    {
        public UserContext(DbContextOptions<UserContext> o) : base(o)  { }
        public DbSet<User> Users { get; set; }
        public DbSet<Admin> Admins { get; set; }
    }
}

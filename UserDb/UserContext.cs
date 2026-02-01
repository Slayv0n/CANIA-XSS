using Microsoft.EntityFrameworkCore;
using SharedModels.General;
using SharedModels.ProcessedEvents;
using UserDb.Models;

namespace UserDb
{
    public class UserContext : DbContext
    {
        public UserContext(DbContextOptions<UserContext> options) : base(options)  { }
        public DbSet<User> Users { get; set; }
        public DbSet<Admin> Admins { get; set; }
    }
}

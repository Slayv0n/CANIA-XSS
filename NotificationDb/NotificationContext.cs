using Microsoft.EntityFrameworkCore;
using NotificationDb.Models;

namespace NotificationDb
{
    public class NotificationContext : DbContext
    {
        public NotificationContext(DbContextOptions<NotificationContext> options) : base(options) { }
        public DbSet<User> Users { get; set; }
    }
}

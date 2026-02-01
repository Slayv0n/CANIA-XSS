using Microsoft.EntityFrameworkCore;
using NotificationDb.Models;
using SharedModels.General;
using SharedModels.ProcessedEvents;

namespace NotificationDb
{
    public class NotificationContext : DbContext
    {
        public NotificationContext(DbContextOptions<NotificationContext> options) : base(options) { }
        public DbSet<User> Users { get; set; }
    }
}

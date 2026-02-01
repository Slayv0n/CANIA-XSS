using Microsoft.EntityFrameworkCore;
using SharedModels.General;
using SharedModels.ProcessedEvents;
using SubscribeDb.Models;

namespace SubscribeDb
{
    public class SubscribeContext : DbContext
    {
        public SubscribeContext(DbContextOptions<SubscribeContext> options) : base(options) { }
        public DbSet<Subscribe> Subscribes { get; set; }
        public DbSet<Tariff> Tariffs { get; set; }
    }
}

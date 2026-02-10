using Microsoft.EntityFrameworkCore;
using TaskDb.Models;

namespace TaskDb
{
    public class TaskContext : DbContext
    {
        public TaskContext(DbContextOptions<TaskContext> options) : base(options) { }
        public DbSet<TaskPentest> Tasks { get; set; }
    }
}

using Hangfire;
using Microsoft.EntityFrameworkCore;
using SharedModels.General;
using UserDb;

namespace UserAPI.Service
{
    public interface ICleanupService
    { 
        Task CleanupAsync();
    }
    public class CleanupService : ICleanupService
    {
        private readonly IDbContextFactory<UserContext> _dbFactory;
        private readonly ILogger<CleanupService> _logger;
        public CleanupService(IDbContextFactory<UserContext> dbFactory,
            IConfiguration configuration,
            ILogger<CleanupService> logger)
        {
            _dbFactory = dbFactory;
            _logger = logger;
        }
        [AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Delete)]
        public async Task CleanupAsync()
        {
            _logger.LogInformation("Cleanup start");
            try
            {
                using var db = await _dbFactory.CreateDbContextAsync();
                var deletedEntities = db.Users.Where(u => u.Status == Status.Deleted);
                db.Users.RemoveRange(deletedEntities);
                await db.SaveChangesAsync();
            }
            catch
            {

            }
        }
    }
}

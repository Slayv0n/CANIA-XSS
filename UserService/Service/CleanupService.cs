using Hangfire;
using Microsoft.EntityFrameworkCore;
using SharedModels.General;
using UserDb;

namespace UserAPI.Service
{
    public class CleanupService : ICleanupService
    {
        private readonly IDbContextFactory<UserContext> _dbContextFactory;
        private readonly ILogger<CleanupService> _logger;
        public CleanupService(IDbContextFactory<UserContext> dbContextFactory,
            IConfiguration configuration,
            ILogger<CleanupService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }
        [AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Delete)]
        public async Task CleanupAsync()
        {
            _logger.LogInformation("Cleanup start");
            try
            {
                using var db = await _dbContextFactory.CreateDbContextAsync();
                var deletedEntities = db.Users.Where(u => u.Status == Status.Deleted);
                db.Users.RemoveRange(deletedEntities);
                await db.SaveChangesAsync();
            }
            catch(Exception ex)
            {
                _logger.LogWarning(ex.Message);
            }
        }
    }
}

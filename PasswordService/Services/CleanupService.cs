using Hangfire;
using Microsoft.EntityFrameworkCore;
using PasswordDb;
using SharedModels.General;

namespace UserAPI.Service
{
    public class CleanupService : ICleanupService
    {
        private readonly IDbContextFactory<PasswordContext> _dbFactory;
        private readonly ILogger<CleanupService> _logger;
        public CleanupService(IDbContextFactory<PasswordContext> dbFactory,
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
                var deletedEntities = db.Passwords.Where(u => u.Status == Status.Deleted);
                db.Passwords.RemoveRange(deletedEntities);
                await db.SaveChangesAsync();
            }
            catch(Exception ex)
            {
                _logger.LogWarning(ex.Message);
            }
        }
    }
}

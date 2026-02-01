using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SharedModels.General;
namespace SharedModels.ProcessedEvents
{
    public interface IProcessedEventChecker 
    {
        Task<bool> CheckRegistrationAsync(ProcessedEvent processedEvent);
    }

    public class ProcessedEventChecker : IProcessedEventChecker
    {
        private IDbContextFactory<ProcessedEventContext> _dbContextFactory;
        private ILogger<ProcessedEventChecker> _logger;

        public ProcessedEventChecker(IDbContextFactory<ProcessedEventContext> dbContextFactory,  ILogger<ProcessedEventChecker> logger)
        {
            _dbContextFactory = dbContextFactory;
            _logger = logger;
        }

        public async Task<bool> CheckRegistrationAsync(ProcessedEvent processedEvent)
        {
            _logger.LogInformation($"{this.GetType()} started at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var entity = await db.ProcessedEvents.FirstOrDefaultAsync(p => p.Id == processedEvent.Id);

            if (entity != null)
            {
                return true;
            }

            await db.ProcessedEvents.AddAsync(processedEvent);
            await db.SaveChangesAsync();

            return false;
        }
    }
}

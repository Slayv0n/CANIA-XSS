using Microsoft.EntityFrameworkCore;
using SharedModels.General;
using SharedModels.ProcessedEvents;
using System;

namespace SharedModels.ProcessedEvents
{
    public static class ProcessedEventsCheker
    {
        public static async Task<bool> CheckRegistrationAsync<TDbContext>(ProcessedEventDbContext<TDbContext> db, ProcessedEvent processedEvent) where TDbContext : DbContext
        {
            var entity = await db.Set<ProcessedEvent>().FirstOrDefaultAsync(p => p.Id == processedEvent.Id);

            if (entity != null)
            {
                return true;
            }

            await db.Set<ProcessedEvent>().AddAsync(processedEvent);
            await db.SaveChangesAsync();

            return false;
        }
    }
}

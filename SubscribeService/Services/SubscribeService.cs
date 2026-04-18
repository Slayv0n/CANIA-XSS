using MassTransit;
using MassTransit.Initializers;
using Microsoft.EntityFrameworkCore;
using SharedModels.Events.Subscribes;
using SharedModels.Exceptions;
using SharedModels.General;
using Subscribe_API.Models.Responses;
using SubscribeDb;
using SubscribeDb.Models;

namespace Subscribe_API.Services
{
    public interface ISubscribeService
    {
        Task<SubscribeResponse> SubscribeAsync(Guid id, Tariff tariff);
        Task<SubscribeResponse?> GetSubscribeAsync(Guid id);
        Task<SubscribeResponse> UpdateSubscribeAsync(Guid id, Tariff tariff);
        Task UnscribeAsync(Guid id);
    }
    public class SubscribeService : ISubscribeService
    {
        private readonly IDbContextFactory<SubscribeContext> _dbContextFactory;
        private readonly IPublishEndpoint _publishEndpoint;
        private readonly ILogger<SubscribeService> _logger;

        public SubscribeService(IDbContextFactory<SubscribeContext> dbContextFactory,
            IPublishEndpoint publishEndpoint,
            ILogger<SubscribeService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _publishEndpoint = publishEndpoint;
            _logger = logger;
        }

        public async Task<SubscribeResponse> SubscribeAsync(Guid id, Tariff tariff)
        {
            _logger.LogInformation($"Subscribe create/update for {id} at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var existingSub = await db.Subscribes.FirstOrDefaultAsync(s => s.Id == id);

            if (existingSub != null)
            {
                existingSub.Tariff = tariff;
                existingSub.Status = Status.Active;
                existingSub.Version++;
            }
            else
            {
                var newSub = new Subscribe()
                {
                    Id = id,
                    Tariff = tariff,
                    Status = Status.Active
                };
                await db.Subscribes.AddAsync(newSub);
            }

            await db.SaveChangesAsync();

            await _publishEndpoint.Publish<Subscribed>(new
            {
                Id = id,
                Name = tariff.Name,
                Cost = tariff.Cost 
            });

            return new SubscribeResponse() { Id = id, Tarrif = tariff };
        }

        public async Task<SubscribeResponse?> GetSubscribeAsync(Guid id)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();

            return await db.Subscribes.AsNoTracking().Include(s => s.Tariff).FirstOrDefaultAsync(s => s.Id == id)
                .Select(s => s != null ? new SubscribeResponse()
                {
                    Id = id,
                    Tarrif = s.Tariff
                } : null);
        }

        public async Task<SubscribeResponse> UpdateSubscribeAsync(Guid id, Tariff tariff)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();
            var subscribe = await db.Subscribes.FirstOrDefaultAsync(s => s.Id == id && s.Status == Status.Active);

            if (subscribe == null) throw new NotFoundException("Subscribe not found");

            subscribe.Tariff = tariff;
            await db.SaveChangesAsync();

            return new SubscribeResponse() { Id = subscribe.Id, Tarrif = subscribe.Tariff };
        }

        public async Task UnscribeAsync(Guid id)
        {
            using var db = await _dbContextFactory.CreateDbContextAsync();
            var subscribe = await db.Subscribes.FirstOrDefaultAsync(s => s.Id == id);

            if (subscribe == null) throw new NotFoundException("Subscribe not found");

            subscribe.Version++;
            subscribe.Status = Status.Deleted;
            await db.SaveChangesAsync();

            await _publishEndpoint.Publish<Unscribed>(new { Id = id });
        }
    }
}
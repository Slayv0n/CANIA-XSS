using MassTransit;
using Microsoft.EntityFrameworkCore;
using SharedModels.Exceptions;
using SharedModels.General;
using Subscribe_API.Models.Responses;
using SubscribeDb;
using SubscribeDb.Models;

namespace Subscribe_API.Services
{
    public interface ISubscribeService
    {
        Task<SubscribeResponse> Subscribe(Guid id, Tariff tariff);
        Task<SubscribeResponse> Update(Guid id, Tariff tariff);
        Task Unscribe(Guid id);
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

        public async Task<SubscribeResponse> Subscribe(Guid id, Tariff tariff)
        {
            _logger.LogInformation($"Subscribe create for {id} at {DateTime.UtcNow} ");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var subscribe = new Subscribe()
            {
                Id = id,
                Tariff = tariff,
                Status = Status.Active
            };

            await db.Subscribes.AddAsync(subscribe);
            await db.SaveChangesAsync();

            _logger.LogInformation($"Subscribe successful for {id} at {DateTime.UtcNow}");

            return new SubscribeResponse()
            {
                Id = subscribe.Id,
                Tarrif = subscribe.Tariff
            };
        }

        public async Task<SubscribeResponse> Update(Guid id, Tariff tariff)
        {
            _logger.LogInformation($"Subscribe update for {id} at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var subscribe = await db.Subscribes.FirstOrDefaultAsync(s => s.Id == id && s.Status == Status.Active);

            if (subscribe == null)
            {
                _logger.LogWarning($"Subscribe not found: {id}");
                throw new NotFoundException("Subscribe not found");
            }

            subscribe.Tariff = tariff;

            await db.SaveChangesAsync();

            _logger.LogInformation($"Subscribe update successful for {id} at {DateTime.UtcNow}");

            return new SubscribeResponse()
            {
                Id = subscribe.Id,
                Tarrif = subscribe.Tariff
            };
        }

        public async Task Unscribe(Guid id)
        {
            _logger.LogInformation($"Unscribe for {id} at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var subscribe = await db.Subscribes.FirstOrDefaultAsync(s => s.Id == id);

            if (subscribe == null)
            {
                _logger.LogWarning($"Subscribe not found: {id}");
                throw new NotFoundException("Subscribe not found");
            }

            subscribe.Version++;
            subscribe.Status = Status.Deleted;

            await db.SaveChangesAsync();

            _logger.LogInformation($"Unscribe succesful for {id} at {DateTime.UtcNow}");
        }
    }
}

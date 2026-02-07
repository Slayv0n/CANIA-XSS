using MassTransit;
using MassTransit.Initializers;
using Microsoft.EntityFrameworkCore;
using Notification_API.Service;
using NotificationDb;
using SharedModels.Events.Subscribes;
using SharedModels.General;
using SharedModels.ProcessedEvents;

namespace Notification_API.Consumers
{
    public class SubscribedConsumer : IConsumer<Subscribed>
    {
        private readonly IDbContextFactory<NotificationContext> _dbContextFactory;
        private readonly INotificationServcie _service;
        private readonly ILogger<SubscribedConsumer> _logger;

        public SubscribedConsumer(IDbContextFactory<NotificationContext> dbContextFactory,
            INotificationServcie service,
            ILogger<SubscribedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _service = service;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<Subscribed> context)
        {
            _logger.LogInformation($"Subscribe message send start at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var address = await db.Users.FirstOrDefaultAsync(u => u.Id == context.Message.Id)
                .Select(u => u != null ? u.Email : null);

            await _service.SendAsync(address,
                "Подписка на Cania",
                "Вы оформили подписку на сервис",
                new SendGrid.Helpers.Mail.Model.HtmlContent($"""
                    Вы оформили подписку <i>{context.Message.Name}</i> на Cania.<br>
                    Цена данного тарифа составит {context.Message.Cost} руб. в месяц.
                    """));
        }
    }
}

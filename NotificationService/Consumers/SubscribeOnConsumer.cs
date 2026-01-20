using MassTransit;
using NotificationDb;
using Microsoft.EntityFrameworkCore;
using SharedModels.Subscribes;
using Notification_API.Service;
using MassTransit.Initializers;

namespace Notification_API.Consumers
{
    public class SubscribeOnConsumer : IConsumer<SubscribeOn>
    {
        private readonly IDbContextFactory<NotificationContext> _dbContextFactory;
        private readonly INotificationServcie _service;
        private readonly ILogger<SubscribeOnConsumer> _logger;

        public SubscribeOnConsumer(IDbContextFactory<NotificationContext> dbContextFactory, INotificationServcie service, ILogger<SubscribeOnConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _service = service;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<SubscribeOn> context)
        {
            _logger.LogInformation($"Subscribe on message send start at {DateTime.UtcNow}");

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

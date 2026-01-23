using MassTransit;
using MassTransit.Initializers;
using Microsoft.EntityFrameworkCore;
using Notification_API.Service;
using NotificationDb;
using SharedModels.General;
using SharedModels.ProcessedEvents;
using SharedModels.Subscribes;

namespace Notification_API.Consumers
{
    public class UnscribedConsumer : IConsumer<Unscribed>
    {
        private readonly IDbContextFactory<NotificationContext> _dbContextFactory;
        private readonly INotificationServcie _service;
        private readonly ILogger<SubscribedConsumer> _logger;

        public UnscribedConsumer(IDbContextFactory<NotificationContext> dbContextFactory, INotificationServcie service, ILogger<SubscribedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _service = service;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<Unscribed> context)
        {
            _logger.LogInformation($"Unscribe message send start at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var processedEvent = new ProcessedEvent()
            {
                Id = context.MessageId ?? Guid.Empty,
                Type = this.GetType().Name.Replace("Consumer", ""),
                RegistrationTime = DateTime.UtcNow,
            };

            var check = await ProcessedEventsCheker.CheckRegistrationAsync(db, processedEvent);

            if (check)
            {
                _logger.LogWarning($"Event {context.MessageId} already started");
                return;
            }

            var address = await db.Users.FirstOrDefaultAsync(u => u.Id == context.Message.Id)
                .Select(u => u != null ? u.Email : null);

            await _service.SendAsync(address,
                "Отказ от подписки на Cania",
                "Вы отказались от подписки на сервис",
                new SendGrid.Helpers.Mail.Model.HtmlContent($"""
                    Вы отказались от подписки на Cania.<br>
                    """));
        }
    }
}


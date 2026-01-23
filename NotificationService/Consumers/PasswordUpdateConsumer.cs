using MassTransit;
using MassTransit.Initializers;
using Microsoft.EntityFrameworkCore;
using Notification_API.Service;
using NotificationDb;
using SharedModels.General;
using SharedModels.Passwords;
using SharedModels.ProcessedEvents;

namespace Notification_API.Consumers
{
    public class PasswordUpdateConsumer : IConsumer<PasswordUpdated>
    {
        private readonly IDbContextFactory<NotificationContext> _dbContextFactory;
        private readonly INotificationServcie _service;
        private readonly ILogger<PasswordUpdateConsumer> _logger;

        public PasswordUpdateConsumer(IDbContextFactory<NotificationContext> dbContextFactory,
            INotificationServcie servcie,
            ILogger<PasswordUpdateConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _service = servcie;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<PasswordUpdated> context)
        {
            _logger.LogInformation($"Password reseted message send start at {DateTime.UtcNow}");

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
                "Смена пароля",
                "Пароль успешно изменён",
                new SendGrid.Helpers.Mail.Model.HtmlContent("Пароль на вашем аккаунте был успешно изменён, если это были <strong>не</strong> вы, свяжитесь с поддержкой"));
        }
    }
}

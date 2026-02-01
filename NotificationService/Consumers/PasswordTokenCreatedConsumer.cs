using MassTransit;
using MassTransit.Initializers;
using Microsoft.EntityFrameworkCore;
using Notification_API.Service;
using NotificationDb;
using SharedModels.Events.Passwords;
using SharedModels.General;
using SharedModels.ProcessedEvents;

namespace Notification_API.Consumers
{
    public class PasswordTokenCreatedConsumer : IConsumer<PasswordTokenCreated> 
    {
        private readonly IDbContextFactory<NotificationContext> _dbContextFactory;
        private readonly INotificationServcie _servcie;
        private readonly ILogger<PasswordTokenCreatedConsumer> _logger;
        private readonly IProcessedEventChecker _processedEventChecker;

        public PasswordTokenCreatedConsumer(IDbContextFactory<NotificationContext> dbContextFactory,
            INotificationServcie servcie,
            ILogger<PasswordTokenCreatedConsumer> logger,
            IProcessedEventChecker processedEventChecker)
        {
            _dbContextFactory = dbContextFactory;
            _servcie = servcie;
            _logger = logger;
            _processedEventChecker = processedEventChecker;
        }

        public async Task Consume(ConsumeContext<PasswordTokenCreated> context)
        {
            _logger.LogInformation($"Password token message send start at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var processedEvent = new ProcessedEvent()
            {
                Id = context.MessageId ?? Guid.Empty,
                Type = this.GetType().Name.Replace("Consumer", ""),
                RegistrationTime = DateTime.UtcNow,
            };

            var check = await _processedEventChecker.CheckRegistrationAsync(processedEvent);

            if (check)
            {
                _logger.LogWarning($"Event {context.MessageId} already started");
                return;
            }

            var address = context.Message.MessageAddress;

            await _servcie.SendAsync(address,
                "Сброс пароля",
                "Перейдите по ссылке, чтобы сменить пароль",
                new SendGrid.Helpers.Mail.Model.HtmlContent($"Для смены пароля перейдите по ссылке {context.Message.Token}"));
        }
    }
}

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
        private readonly INotificationServcie _servcie;
        private readonly ILogger<PasswordTokenCreatedConsumer> _logger;

        public PasswordTokenCreatedConsumer(INotificationServcie servcie,
            ILogger<PasswordTokenCreatedConsumer> logger)
        {
            _servcie = servcie;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<PasswordTokenCreated> context)
        {
            _logger.LogInformation($"Password token message send start at {DateTime.UtcNow}");

            var address = context.Message.MessageAddress;

            await _servcie.SendAsync(address,
                "Сброс пароля",
                "Перейдите по ссылке, чтобы сменить пароль",
                new SendGrid.Helpers.Mail.Model.HtmlContent($"Для смены пароля перейдите по ссылке {context.Message.Token}"));
        }
    }
}

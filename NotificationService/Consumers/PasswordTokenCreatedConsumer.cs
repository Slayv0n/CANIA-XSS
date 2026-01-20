using MassTransit;
using MassTransit.Initializers;
using Microsoft.EntityFrameworkCore;
using Notification_API.Service;
using NotificationDb;
using SharedModels.Passwords;

namespace Notification_API.Consumers
{
    public class PasswordTokenCreatedConsumer : IConsumer<PasswordTokenCreated> 
    {
        private readonly IDbContextFactory<NotificationContext> _dbContextFactory;
        private readonly INotificationServcie _servcie;
        private readonly ILogger<PasswordTokenCreatedConsumer> _logger;

        public PasswordTokenCreatedConsumer(IDbContextFactory<NotificationContext> dbContextFactory, INotificationServcie servcie, ILogger<PasswordTokenCreatedConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _servcie = servcie;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<PasswordTokenCreated> context)
        {
            _logger.LogInformation($"Password token message send start at {DateTime.UtcNow}");
            using var db = await _dbContextFactory.CreateDbContextAsync();

            var address = await db.Users.FirstOrDefaultAsync(u => u.Id == context.Message.Id)
                .Select(u => u != null ? u.Email : null);

            await _servcie.SendAsync(address,
                "Сброс пароля",
                "Перейдите по ссылке, чтобы сменить пароль",
                new SendGrid.Helpers.Mail.Model.HtmlContent($"Для смены пароля перейдите по ссылке {context.Message.Token}"));
        }
    }
}

using MassTransit;
using MassTransit.Initializers;
using Microsoft.EntityFrameworkCore;
using Notification_API.Service;
using NotificationDb;
using SharedModels.Passwords;

namespace Notification_API.Consumers
{
    public class PasswordResetConsumer : IConsumer<PasswordReseted>
    {
        private readonly IDbContextFactory<NotificationContext> _dbContextFactory;
        private readonly INotificationServcie _service;
        private readonly ILogger<PasswordResetConsumer> _logger;

        public PasswordResetConsumer(IDbContextFactory<NotificationContext> dbContextFactory,
            INotificationServcie servcie,
            ILogger<PasswordResetConsumer> logger)
        {
            _dbContextFactory = dbContextFactory;
            _service = servcie;
            _logger = logger;
        }

        public async Task Consume(ConsumeContext<PasswordReseted> context)
        {
            _logger.LogInformation($"Password reseted message send start at {DateTime.UtcNow}");

            using var db = await _dbContextFactory.CreateDbContextAsync();

            var address = await db.Users.FirstOrDefaultAsync(u => u.Id == context.Message.Id)
                .Select(u => u != null ? u.Email : null);

            await _service.SendAsync(address,
                "Смена пароля",
                "Пароль успешно изменён",
                new SendGrid.Helpers.Mail.Model.HtmlContent("Пароль на вашем аккаунте был успешно изменён, если это были <strong>не</strong> вы, свяжитесь с поддержкой"));
        }
    }
}

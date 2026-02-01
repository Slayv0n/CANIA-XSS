using MassTransit;
using Microsoft.EntityFrameworkCore;
using Notification_API.Service;
using NotificationDb;
using NotificationDb.Models;
using SharedModels.Events.Users;
using SharedModels.General;
using SharedModels.ProcessedEvents;

namespace Notification_API.Consumers
{
    public class UserCreatedConsumer : IConsumer<UserCreated>
    {
        private readonly IDbContextFactory<NotificationContext> _dbContextFactory;
        private readonly INotificationServcie _service;
        private readonly ILogger<UserCreatedConsumer> _logger;
        private readonly IProcessedEventChecker _processedEventChecker;

        public UserCreatedConsumer(IDbContextFactory<NotificationContext> dbContextFactory,
            INotificationServcie servcie,
            ILogger<UserCreatedConsumer> logger,
            IProcessedEventChecker processedEventChecker)
        {
            _dbContextFactory = dbContextFactory;
            _service = servcie;
            _logger = logger;
            _processedEventChecker = processedEventChecker;
        }

        public async Task Consume(ConsumeContext<UserCreated> context)
        {
            _logger.LogInformation($"Registration message send start at {DateTime.UtcNow}");

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

            var user = new User()
            {
                Id = context.Message.Id,
                Email = context.Message.Email,
                Status = context.Message.Status
            };
            await db.Users.AddAsync(user);
            await db.SaveChangesAsync();

            var address = user.Email;
            await _service.SendAsync(address,
                "Регистрация",
                "Вы зарегистрировались на сервисе Cania",
                new SendGrid.Helpers.Mail.Model.HtmlContent("<strong>Вы были успешно зарегистрированы на сервисе Cania</strong>")
                );
        }
    }
}

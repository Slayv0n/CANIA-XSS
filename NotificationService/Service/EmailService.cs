using Microsoft.EntityFrameworkCore;
using MimeKit;
using MimeKit.Text;
using MailKit.Net.Smtp;
using MailKit.Security; // Добавили для TLS
using NotificationDb;
using SendGrid.Helpers.Mail.Model;

namespace Notification_API.Service
{
    public interface INotificationServcie 
    {
        Task SendAsync(string address, string subject = "", string plainText = "", HtmlContent? htmlContent = null);
    }

    public class EmailService : INotificationServcie
    {
        private readonly IDbContextFactory<NotificationContext> _dbContextFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IDbContextFactory<NotificationContext> dbContextFactory,
            IConfiguration configuration,
            ILogger<EmailService> logger)
        {
            _dbContextFactory = dbContextFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendAsync(string address, string subject = "", string plainText = "", HtmlContent? htmlContent = null)
        {
            try
            {
                _logger.LogInformation($"Send to {address} started");

                var smtpHost = _configuration["Email:Smtp:Host"] ?? "smtp.gmail.com";
                var smtpPort = _configuration.GetValue<int>("Email:Smtp:Port", 587);
                var smtpUsername = _configuration["Email:Smtp:Username"];
                var smtpPassword = _configuration.GetValue<string>("GMAIL_PASSWORD");

                var fromEmail = _configuration["Email:FromEmail"] ?? "caniapentest@gmail.com";
                var fromName = _configuration["Email:FromName"] ?? "Cania";

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(fromName, fromEmail));
                message.To.Add(new MailboxAddress("", address));
                message.Subject = subject;

                var bb = new BodyBuilder();
                bb.TextBody = plainText;
                if (htmlContent != null) bb.HtmlBody = htmlContent.Value;
                message.Body = bb.ToMessageBody();

                using var smtp = new SmtpClient();
                
                await smtp.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);

                if (!string.IsNullOrEmpty(smtpUsername) && !string.IsNullOrEmpty(smtpPassword))
                {
                    await smtp.AuthenticateAsync(smtpUsername, smtpPassword);
                }

                await smtp.SendAsync(message);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation($"Send to {address} success");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex.Message);
                throw;
            }
        }
    }
}
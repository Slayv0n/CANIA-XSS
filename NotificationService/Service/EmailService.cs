using Microsoft.EntityFrameworkCore;
using MimeKit;
using MimeKit.Text;
using MailKit.Net.Smtp;
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

                var smtpHost = _configuration["Email:Smtp:Host"] ?? "localhost";
                var smtpPort = _configuration.GetValue<int>("Email:Smtp:Port", 1025);
                var smtpUsername = _configuration["Email:Smtp:Username"];
                var smtpPassword = _configuration.GetValue<string>("GMAIL_PASSWORD");

                var fromEmail = _configuration["Email:FromEmail"] ?? "caniapentsest@gmail.com";
                var fromName = _configuration["Email:FromName"] ?? "Cania";

                var message = new MimeMessage();

                var from = new MailboxAddress(fromName, fromEmail);
                message.From.Add(from);

                var to = new MailboxAddress("", address);
                message.To.Add(to);

                message.Subject = subject;
                var bb = new BodyBuilder();
                bb.TextBody = plainText;
                bb.HtmlBody = htmlContent != null ? htmlContent.Value : null;
                message.Body = bb.ToMessageBody();

                using var smtp = new SmtpClient();
                await smtp.ConnectAsync(smtpHost, 1025);

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
                _logger.LogWarning(ex.Message);
                throw;
            }
        }
    }
}

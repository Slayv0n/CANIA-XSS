namespace PasswordDb.Models
{
    public class PasswordToken
    {
        public Guid Id { get; set; }
        public required string Token { get; set; }
        public DateTime CreateTime { get; set; } = DateTime.UtcNow;
        public DateTime ExpireTime { get; set; }
    }
}

using SharedModels.General;

namespace SharedModels.Events.Passwords
{
    public class PasswordUpdated
    {
        public Guid Id { get; set; }
        public required string PasswordHash { get; set; }
    }
}

using SharedModels.General;

namespace SharedModels.Events.Users
{
    public class UserSocialAccountCreated
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = "";
        public string? PasswordHash { get; set; } = null;
        public Status Status { get; set; } 
        public int Version { get; set; }
    }
}

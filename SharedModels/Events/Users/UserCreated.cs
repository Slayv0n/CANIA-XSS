using SharedModels.General;

namespace SharedModels.Events.Users
{
    public class UserCreated
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = "";
        public string PasswordHash { get; set; } = "";
        public Status Status { get; set; }
        public int Version { get; set; } = 0;
    }
}

using SharedModels.General;

namespace SharedModels.Events.Users
{
    public class UserUpdated
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = "";
        public Status Status { get; set; }
    }
}

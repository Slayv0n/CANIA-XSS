using SharedModels.General;

namespace SharedModels.Events.Passwords
{
    public class PasswordTokenCreated
    {
        public string MessageAddress { get; set; } = "";
        public string Token { get; set; } = "";
    }
}

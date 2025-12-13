using System.ComponentModel.DataAnnotations;

namespace SharedModels.Users
{
    public class UserCreated
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string Status { get; set; } = "NotActive";
        public int Version { get; set; } = 0;
    }
}

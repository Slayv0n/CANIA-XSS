using SharedModels.General;
using UserDb.Models;

namespace UserAPI.Models.Responses
{
    public class UserResponse
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public Status Status { get; set; }
        public int Version { get; set; }
        public UserResponse() { }
        public UserResponse(User user)
        {
            Id = user.Id;
            Email = user.Email;
            Status = user.Status;
            Version = user.Version;
        }
    }
}

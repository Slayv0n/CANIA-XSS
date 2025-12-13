namespace UserAPI.Models.Responses
{
    public class UserCreateResponse
    {
        public Guid Id { get; set; }
        public required string Email { get; set; }
    }
}

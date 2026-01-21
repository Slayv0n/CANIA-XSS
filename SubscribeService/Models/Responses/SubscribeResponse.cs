using SubscribeDb.Models;

namespace Subscribe_API.Models.Responses
{
    public class SubscribeResponse
    {
        public Guid Id { get; set; }
        public required Tariff Tarrif { get; set; }
    }
}

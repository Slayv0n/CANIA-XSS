using SubscribeDb.Models;

namespace Subscribe_API.Models.Requests
{
    public class SubscribeRequest
    {
        public required Tariff Tariff { get; set; }
    }
}

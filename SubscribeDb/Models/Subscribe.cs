using SharedModels.General;

namespace SubscribeDb.Models
{
    public class Subscribe
    {
        public Guid Id {  get; set; }
        public required Tariff Tariff { get; set; }
        public Status Status { get; set; }
        public int Version { get; set; }
    }
}

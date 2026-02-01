using SharedModels.General;

namespace SharedModels.Events.Subscribes
{
    public class Subscribed
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
        public string Cost { get; set; } = "";
    }
}

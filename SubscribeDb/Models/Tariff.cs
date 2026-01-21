namespace SubscribeDb.Models
{
    public class Tariff
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public string Description { get; set; } = "";
        public double Cost { get; set; }
        public DateTime CreateTime { get; set; } = DateTime.UtcNow;
        public DateTime ExpiredTime { get; set; }
    }
}

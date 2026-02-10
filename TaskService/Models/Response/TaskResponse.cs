using SharedModels.General;

namespace Task_API.Models.Response
{
    public class TaskResponse
    {
        public Guid Id { get; init; }
        public required string Host { get; init; }
        public List<TypeOfAttack> TypeOfAttacks { get; init; } = new();
        public Depth Depth { get; init; }
        public StatusTask Status { get; set; }
    }
}

using SharedModels.General;

namespace SharedModels.Events.Tasks
{
    public class TaskCreated
    {
        public Guid Id { get; init; }
        public Guid UserId { get; init; }
        public required string Host { get; init; }
        public List<TypeOfAttack> TypeOfAttacks { get; init; } = new();
        public Depth depth { get; init; }
    }
}

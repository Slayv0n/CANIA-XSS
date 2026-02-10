using SharedModels.General;

namespace SharedModels.Events.Tasks
{
    public class TaskStatusUpdated
    {
        public Guid Id { get; init; }
        public StatusTask Status { get; init; }
    }
}

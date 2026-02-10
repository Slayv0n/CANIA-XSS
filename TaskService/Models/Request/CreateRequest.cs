using SharedModels.General;
using System.ComponentModel.DataAnnotations;

namespace Task_API.Models.Request
{
    public class CreateRequest
    {
        [StringLength(255)]
        public required string Host { get; init; }
        public List<TypeOfAttack> TypeOfAttacks { get; init; } = new();
        public Depth Depth { get; init; }
    }
}

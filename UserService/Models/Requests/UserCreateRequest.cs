using System.ComponentModel.DataAnnotations;

namespace UserAPI.Models.Requests
{
    public class UserCreateRequest
    {
        [EmailAddress]
        [StringLength(255, MinimumLength = 6, ErrorMessage = "Недопустимая длина Email")]
        public required string Email { get; set; }
        [RegularExpression(@"^\s*(?=.*[a-zа-яё])(?=.*[A-ZА-ЯЁ])(?=.*\d)(?=.*[^\da-zA-Zа-яА-ЯЁё]).{8,30}\s*$",
        ErrorMessage = "Пароль должен содержать заглавную и строчную буквы, цифру и спецсимвол.")]
        public required string Password { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace Password_API.Models.Requests
{
    public class UpdateRequest
    {
        [RegularExpression(@"^\s*(?=.*[a-zа-яё])(?=.*[A-ZА-ЯЁ])(?=.*\d)(?=.*[^\da-zA-Zа-яА-ЯЁё]).{8,30}\s*$",
        ErrorMessage = "Пароль должен содержать 8-30 символов, заглавную и строчную буквы, цифру и спецсимвол.")]
        public required string Password { get; set; }
    }
}

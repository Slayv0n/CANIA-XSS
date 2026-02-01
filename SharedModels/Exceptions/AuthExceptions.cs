namespace SharedModels.Exceptions
{
    public class LoginException : Exception
    {
        public LoginException(string message) : base(message) { }
    }

    public class TokenException : Exception
    {
        public TokenException(string message) : base(message) { }
    }
}
